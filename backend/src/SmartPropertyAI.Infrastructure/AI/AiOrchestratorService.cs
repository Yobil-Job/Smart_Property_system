using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.AI.DTOs;
using SmartPropertyAI.Application.Features.Amenities;
using SmartPropertyAI.Application.Features.Conversations.DTOs;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.AI;

public class AiOrchestratorService : IAiOrchestratorService
{
    private readonly ApplicationDbContext _context;
    private readonly IAiProvider _aiProvider;
    private readonly IPromptTemplateManager _promptTemplateManager;
    private readonly IAiToolRegistry _toolRegistry;
    private readonly IIntentDetectionService _intentDetector;
    private readonly IConversationalFormService _formService;
    private readonly IAiToolExecutionService _toolExecutor;
    private readonly IAmenityService _amenityService;
    private readonly ILogger<AiOrchestratorService> _logger;

    public AiOrchestratorService(
        ApplicationDbContext context,
        IAiProvider aiProvider,
        IPromptTemplateManager promptTemplateManager,
        IAiToolRegistry toolRegistry,
        IIntentDetectionService intentDetector,
        IConversationalFormService formService,
        IAiToolExecutionService toolExecutor,
        IAmenityService amenityService,
        ILogger<AiOrchestratorService> logger)
    {
        _context = context;
        _aiProvider = aiProvider;
        _promptTemplateManager = promptTemplateManager;
        _toolRegistry = toolRegistry;
        _intentDetector = intentDetector;
        _formService = formService;
        _toolExecutor = toolExecutor;
        _amenityService = amenityService;
        _logger = logger;
    }

    public async Task<AiChatResponseDto> ProcessChatTurnAsync(
        AiChatRequestDto request,
        Guid userId,
        string userRole,
        string userName,
        string clientIp,
        CancellationToken ct = default)
    {
        // 1. Load or initialize Conversation
        Conversation conversation;
        if (request.ConversationId.HasValue && request.ConversationId.Value != Guid.Empty)
        {
            conversation = await _context.Conversations
                .Include(c => c.CurrentWorkflow)
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == request.ConversationId.Value, ct)
                ?? throw new NotFoundException(nameof(Conversation), request.ConversationId.Value);

            if (conversation.UserId != userId)
            {
                throw new ForbiddenException("You are not authorized to access this conversation.");
            }
        }
        else
        {
            conversation = new Conversation
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Role = userRole,
                Title = request.Message.Length > 40 ? request.Message.Substring(0, 37) + "..." : request.Message,
                Status = ConversationStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Conversations.Add(conversation);
        }

        // Record User Message
        var userMsg = new ConversationMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderType = SenderType.User,
            Content = request.Message,
            CreatedAt = DateTime.UtcNow
        };
        _context.ConversationMessages.Add(userMsg);

        string replyMessage;
        bool requiresConfirmation = false;
        PendingActionDto? pendingAction = null;

        // 2. Check if awaiting confirmation
        if (conversation.Status == ConversationStatus.AwaitingConfirmation && conversation.CurrentWorkflow != null)
        {
            var intent = await _intentDetector.DetectIntentAsync(request.Message, userRole, ct);

            if (string.Equals(intent, "Confirmation", StringComparison.OrdinalIgnoreCase))
            {
                var execResult = await _toolExecutor.ExecutePendingActionAsync(
                    conversation.CurrentWorkflow,
                    userId,
                    userRole,
                    clientIp,
                    ct);

                conversation.Status = ConversationStatus.Completed;
                conversation.UpdatedAt = DateTime.UtcNow;

                var ticketLabel = string.IsNullOrWhiteSpace(execResult.TicketNumber) ? "" : $" #{execResult.TicketNumber}";
                replyMessage = $"Your request{ticketLabel} has been submitted successfully! A notification has been dispatched to operations.";
            }
            else if (string.Equals(intent, "Cancellation", StringComparison.OrdinalIgnoreCase))
            {
                conversation.CurrentWorkflow.ConfirmationStatus = ConfirmationStatus.Rejected;
                conversation.CurrentWorkflow.UpdatedAt = DateTime.UtcNow;
                conversation.Status = ConversationStatus.Cancelled;
                conversation.UpdatedAt = DateTime.UtcNow;

                replyMessage = "I have cancelled the pending request. Is there anything else I can assist you with?";
            }
            else
            {
                replyMessage = "A request is currently awaiting your confirmation. Would you like me to submit it, or would you prefer to cancel?";
                requiresConfirmation = true;
                pendingAction = TryParsePendingAction(conversation.CurrentWorkflow.PendingActionJson);
            }
        }
        // 3. Check if continuing an existing active form workflow
        else if (conversation.Status == ConversationStatus.AwaitingInformation && conversation.CurrentWorkflow != null)
        {
            var formResult = await _formService.ProcessFormTurnAsync(
                conversation.CurrentWorkflow,
                request.Message,
                userRole,
                ct);

            conversation.CurrentWorkflow.CollectedFieldsJson = formResult.CollectedFieldsJson;
            conversation.CurrentWorkflow.MissingFieldsJson = formResult.MissingFieldsJson;
            conversation.CurrentWorkflow.UpdatedAt = DateTime.UtcNow;

            replyMessage = formResult.ReplyMessage;

            if (formResult.IsComplete && formResult.PendingAction != null)
            {
                conversation.CurrentWorkflow.PendingActionJson = JsonSerializer.Serialize(formResult.PendingAction);
                conversation.CurrentWorkflow.ConfirmationStatus = ConfirmationStatus.Pending;
                conversation.Status = ConversationStatus.AwaitingConfirmation;
                requiresConfirmation = true;
                pendingAction = formResult.PendingAction;
            }
            else
            {
                conversation.Status = ConversationStatus.AwaitingInformation;
            }

            conversation.UpdatedAt = DateTime.UtcNow;
        }
        // 4. Role Isolation check for Residents attempting Admin/Staff operations
        else if (string.Equals(userRole, UserRoles.Resident, StringComparison.OrdinalIgnoreCase) &&
                 (request.Message.Contains("assign staff", StringComparison.OrdinalIgnoreCase) ||
                  request.Message.Contains("all maintenance", StringComparison.OrdinalIgnoreCase) ||
                  request.Message.Contains("other residents", StringComparison.OrdinalIgnoreCase)))
        {
            // Polite role isolation rejection
            replyMessage = "As a resident, you do not have permission to assign staff members or view administrative system records. I can assist you with reporting maintenance issues or registering visitors.";
            conversation.Status = ConversationStatus.Active;
            conversation.UpdatedAt = DateTime.UtcNow;
        }
        // 5. New Intent classification & execution
        else
        {
            var detectedIntent = await _intentDetector.DetectIntentAsync(request.Message, userRole, ct);

            if (string.Equals(detectedIntent, "CreateMaintenanceRequest", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(detectedIntent, "RegisterVisitor", StringComparison.OrdinalIgnoreCase))
            {
                var workflow = new ConversationWorkflow
                {
                    Id = Guid.NewGuid(),
                    ConversationId = conversation.Id,
                    Intent = detectedIntent,
                    WorkflowType = detectedIntent,
                    CollectedFieldsJson = "{}",
                    MissingFieldsJson = "[]",
                    ConfirmationStatus = ConfirmationStatus.None,
                    UpdatedAt = DateTime.UtcNow
                };
                conversation.CurrentWorkflow = workflow;
                _context.ConversationWorkflows.Add(workflow);

                var formResult = await _formService.ProcessFormTurnAsync(workflow, request.Message, userRole, ct);

                workflow.CollectedFieldsJson = formResult.CollectedFieldsJson;
                workflow.MissingFieldsJson = formResult.MissingFieldsJson;
                workflow.UpdatedAt = DateTime.UtcNow;

                replyMessage = formResult.ReplyMessage;

                if (formResult.IsComplete && formResult.PendingAction != null)
                {
                    workflow.PendingActionJson = JsonSerializer.Serialize(formResult.PendingAction);
                    workflow.ConfirmationStatus = ConfirmationStatus.Pending;
                    conversation.Status = ConversationStatus.AwaitingConfirmation;
                    requiresConfirmation = true;
                    pendingAction = formResult.PendingAction;
                }
                else
                {
                    conversation.Status = ConversationStatus.AwaitingInformation;
                }

                conversation.UpdatedAt = DateTime.UtcNow;
            }
            else if (string.Equals(detectedIntent, "MaintenanceStatusInquiry", StringComparison.OrdinalIgnoreCase))
            {
                replyMessage = await HandleMaintenanceStatusInquiryAsync(userId, userRole, ct);
                conversation.Status = ConversationStatus.Active;
                conversation.UpdatedAt = DateTime.UtcNow;
            }
            else if (string.Equals(detectedIntent, "VisitorStatusInquiry", StringComparison.OrdinalIgnoreCase))
            {
                replyMessage = await HandleVisitorStatusInquiryAsync(userId, userRole, request.Message, ct);
                conversation.Status = ConversationStatus.Active;
                conversation.UpdatedAt = DateTime.UtcNow;
            }
            else if (string.Equals(detectedIntent, "AmenityStatusInquiry", StringComparison.OrdinalIgnoreCase))
            {
                replyMessage = await HandleAmenityInquiryAsync(userId, userRole, ct);
                conversation.Status = ConversationStatus.Active;
                conversation.UpdatedAt = DateTime.UtcNow;
            }
            else if (string.Equals(detectedIntent, "BookAmenity", StringComparison.OrdinalIgnoreCase))
            {
                replyMessage = await HandleBookAmenityAsync(userId, request.Message, ct);
                conversation.Status = ConversationStatus.Active;
                conversation.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // General conversational completion with LLM
                replyMessage = await GenerateConversationalReplyAsync(conversation, request.Message, userRole, userName, ct);
                conversation.Status = ConversationStatus.Active;
                conversation.UpdatedAt = DateTime.UtcNow;
            }
        }

        // Record Assistant Message
        var assistantMsg = new ConversationMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderType = SenderType.Assistant,
            Content = replyMessage,
            CreatedAt = DateTime.UtcNow
        };
        _context.ConversationMessages.Add(assistantMsg);

        await _context.SaveChangesAsync(ct);

        return new AiChatResponseDto
        {
            ConversationId = conversation.Id,
            ReplyMessage = replyMessage,
            Status = conversation.Status.ToString(),
            RequiresConfirmation = requiresConfirmation,
            PendingAction = pendingAction
        };
    }

    public async Task<ConfirmActionResponseDto> ConfirmPendingActionAsync(
        Guid conversationId,
        Guid userId,
        string userRole,
        string clientIp,
        CancellationToken ct = default)
    {
        var conversation = await _context.Conversations
            .Include(c => c.CurrentWorkflow)
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new NotFoundException(nameof(Conversation), conversationId);
        }

        if (conversation.UserId != userId)
        {
            throw new ForbiddenException("You are not authorized to confirm actions on this conversation.");
        }

        if (conversation.Status == ConversationStatus.Completed || conversation.CurrentWorkflow?.ConfirmationStatus == ConfirmationStatus.Confirmed)
        {
            throw new ConflictException("This pending action has already been confirmed and executed.");
        }

        if (conversation.CurrentWorkflow == null || conversation.Status != ConversationStatus.AwaitingConfirmation)
        {
            throw new ValidationException("Conversation", "Conversation is not currently awaiting confirmation of any pending action.");
        }

        var result = await _toolExecutor.ExecutePendingActionAsync(
            conversation.CurrentWorkflow,
            userId,
            userRole,
            clientIp,
            ct);

        conversation.Status = ConversationStatus.Completed;
        conversation.UpdatedAt = DateTime.UtcNow;

        var assistantMsg = new ConversationMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderType = SenderType.Assistant,
            Content = $"{result.Message} (Ticket: {result.TicketNumber})",
            CreatedAt = DateTime.UtcNow
        };
        _context.ConversationMessages.Add(assistantMsg);

        await _context.SaveChangesAsync(ct);

        return result;
    }

    public async Task<bool> CancelPendingActionAsync(
        Guid conversationId,
        Guid userId,
        string? reason,
        string clientIp,
        CancellationToken ct = default)
    {
        var conversation = await _context.Conversations
            .Include(c => c.CurrentWorkflow)
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new NotFoundException(nameof(Conversation), conversationId);
        }

        if (conversation.UserId != userId)
        {
            throw new ForbiddenException("You are not authorized to cancel actions on this conversation.");
        }

        if (conversation.CurrentWorkflow != null)
        {
            conversation.CurrentWorkflow.ConfirmationStatus = ConfirmationStatus.Rejected;
            conversation.CurrentWorkflow.UpdatedAt = DateTime.UtcNow;
        }

        conversation.Status = ConversationStatus.Cancelled;
        conversation.UpdatedAt = DateTime.UtcNow;

        var cancelText = string.IsNullOrWhiteSpace(reason)
            ? "The pending action has been cancelled."
            : $"The pending action has been cancelled: {reason}";

        var assistantMsg = new ConversationMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderType = SenderType.Assistant,
            Content = cancelText,
            CreatedAt = DateTime.UtcNow
        };
        _context.ConversationMessages.Add(assistantMsg);

        await _context.SaveChangesAsync(ct);

        return true;
    }

    private async Task<string> HandleMaintenanceStatusInquiryAsync(Guid userId, string userRole, CancellationToken ct)
    {
        var isStaffOrAdmin = string.Equals(userRole, UserRoles.Staff, StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(userRole, UserRoles.Administrator, StringComparison.OrdinalIgnoreCase);

        if (isStaffOrAdmin)
        {
            var pendingCount = await _context.MaintenanceRequests
                .AsNoTracking()
                .Where(m => m.Status == MaintenanceStatus.Pending)
                .CountAsync(ct);

            var inProgressCount = await _context.MaintenanceRequests
                .AsNoTracking()
                .Where(m => m.Status == MaintenanceStatus.InProgress || m.Status == MaintenanceStatus.Assigned)
                .CountAsync(ct);

            return $"Currently across operations, there are {pendingCount} maintenance ticket(s) pending triage and {inProgressCount} in progress. You can review and dispatch them in the Maintenance Queue.";
        }

        var resident = await _context.Residents
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active, ct);

        if (resident == null)
        {
            return "I could not locate an active resident profile for your account to check maintenance records.";
        }

        var tickets = await _context.MaintenanceRequests
            .AsNoTracking()
            .Where(m => m.ResidentId == resident.Id)
            .OrderByDescending(m => m.CreatedAt)
            .Take(4)
            .ToListAsync(ct);

        if (tickets.Count == 0)
        {
            return "You do not have any open or previous maintenance tickets on record. If you need any repairs or assistance, just describe the issue and I'll submit a ticket for you!";
        }

        var lines = tickets.Select(t =>
            $"• Ticket #REQ-{t.Id.ToString("N").Substring(0, 8).ToUpperInvariant()}: {t.Title} (Status: {t.Status}, Category: {t.Category})");

        return "Here are your recent maintenance requests:\n" + string.Join("\n", lines);
    }

    private async Task<string> HandleVisitorStatusInquiryAsync(Guid userId, string userRole, string userMessage, CancellationToken ct)
    {
        var isStaffOrAdmin = string.Equals(userRole, UserRoles.Staff, StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(userRole, UserRoles.Administrator, StringComparison.OrdinalIgnoreCase);

        if (isStaffOrAdmin)
        {
            var nowUtc = DateTime.UtcNow;
            var todayStart = nowUtc.Date;
            var endOfWeek = todayStart.AddDays(7);

            var weekCount = await _context.Visitors
                .AsNoTracking()
                .Where(v => v.ExpectedArrival >= todayStart && v.ExpectedArrival <= endOfWeek)
                .CountAsync(ct);

            var activeOnSite = await _context.Visitors
                .AsNoTracking()
                .Where(v => v.Status == VisitorStatus.CheckedIn)
                .CountAsync(ct);

            return $"Across the property, there are {weekCount} visitor pass(es) scheduled for this week, and {activeOnSite} guest(s) currently checked in on-site. You can view all entries on the Security Desk page.";
        }

        var resident = await _context.Residents
            .Include(r => r.Apartment)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active, ct);

        if (resident == null)
        {
            return "I could not locate an active resident profile for your account to check visitor passes.";
        }

        var now = DateTime.UtcNow;
        var startOfWeek = now.Date.AddDays(-(int)now.DayOfWeek);
        var endOfWeekBoundary = startOfWeek.AddDays(7);

        var upcomingVisitors = await _context.Visitors
            .AsNoTracking()
            .Where(v => v.ResidentId == resident.Id && (v.ExpectedArrival >= startOfWeek || v.Status == VisitorStatus.CheckedIn || v.Status == VisitorStatus.Pending || v.Status == VisitorStatus.Approved))
            .OrderBy(v => v.ExpectedArrival)
            .Take(5)
            .ToListAsync(ct);

        if (upcomingVisitors.Count == 0)
        {
            return "You do not have any visitors scheduled for this week. If you are expecting someone, simply let me know their name and when they're coming, and I'll be happy to create a visitor pass for you!";
        }

        var lines = upcomingVisitors.Select(v =>
        {
            var statusLabel = v.Status switch
            {
                VisitorStatus.Approved => "Approved",
                VisitorStatus.CheckedIn => "Checked In (On-Site)",
                VisitorStatus.CheckedOut => "Checked Out",
                VisitorStatus.Rejected => "Declined",
                _ => "Pending Approval"
            };
            return $"• {v.VisitorName} ({v.Purpose}) — {v.ExpectedArrival:ddd, MMM d h:mm tt} UTC [{statusLabel}]";
        });

        return "Here are your scheduled visitors for this week:\n" + string.Join("\n", lines) + "\n\nWould you like me to register another guest or update any of these passes?";
    }

    private async Task<string> HandleAmenityInquiryAsync(Guid userId, string userRole, CancellationToken ct)
    {
        var amenities = await _amenityService.GetAmenitiesAsync(null, ct);
        if (amenities.Count == 0)
        {
            return "Our community currently does not have any active amenities configured.";
        }

        var lines = amenities.Select(a =>
            $"• **{a.Name}** (Capacity: {a.Capacity} guests, Hours: {a.OpenTime} – {a.CloseTime})\n  _{a.Description}_");

        var myBookings = await _amenityService.GetMyBookingsAsync(userId, ct);
        var activeBookings = myBookings
            .Where(b => b.Status == "Confirmed" && b.BookingDate.Date >= DateTime.UtcNow.Date)
            .Take(3)
            .ToList();

        var bookingSummary = "";
        if (activeBookings.Count > 0)
        {
            var bLines = activeBookings.Select(b =>
                $"  - {b.AmenityName} on {b.BookingDate:ddd, MMM d} ({b.StartTime} - {b.EndTime})");
            bookingSummary = "\n\n**Your Upcoming Reservations:**\n" + string.Join("\n", bLines);
        }

        return "Here are the shared amenities available in your building:\n\n" +
               string.Join("\n\n", lines) +
               bookingSummary +
               "\n\nYou can reserve any amenity directly through the Amenities tab or by telling me when you'd like to book!";
    }

    private async Task<string> HandleBookAmenityAsync(Guid userId, string message, CancellationToken ct)
    {
        var amenities = await _amenityService.GetAmenitiesAsync(null, ct);
        var matched = amenities.FirstOrDefault(a =>
            message.Contains(a.Name.Split(' ')[0], StringComparison.OrdinalIgnoreCase) ||
            (message.Contains("bbq", StringComparison.OrdinalIgnoreCase) && a.Name.Contains("BBQ", StringComparison.OrdinalIgnoreCase)) ||
            (message.Contains("pool", StringComparison.OrdinalIgnoreCase) && a.Name.Contains("Pool", StringComparison.OrdinalIgnoreCase)) ||
            (message.Contains("cinema", StringComparison.OrdinalIgnoreCase) && a.Name.Contains("Cinema", StringComparison.OrdinalIgnoreCase)) ||
            (message.Contains("ev", StringComparison.OrdinalIgnoreCase) && a.Name.Contains("EV", StringComparison.OrdinalIgnoreCase)));

        if (matched == null)
        {
            var names = string.Join(", ", amenities.Select(a => a.Name));
            return $"Which amenity would you like to reserve? We have: {names}.";
        }

        return $"I would be glad to help you reserve the **{matched.Name}**! Operating hours are {matched.OpenTime} – {matched.CloseTime} with a max capacity of {matched.Capacity} guests.\n\nPlease visit the **Building Amenities** portal to view real-time hourly slot availability and confirm your booking with one click!";
    }

    private async Task<string> GenerateConversationalReplyAsync(
        Conversation conversation,
        string userMessage,
        string role,
        string userName,
        CancellationToken ct)
    {
        var templateName = role.ToLowerInvariant() switch
        {
            "resident" => "System_Resident_Assistant",
            "staff" => "System_Staff_Assistant",
            "administrator" => "System_Admin_Assistant",
            _ => "System_Resident_Assistant"
        };

        var systemPrompt = _promptTemplateManager.RenderTemplate(templateName, new Dictionary<string, string>
        {
            ["UserName"] = userName,
            ["Role"] = role
        });

        var messages = new List<AiChatMessage>
        {
            AiChatMessage.System(systemPrompt)
        };

        // Add recent conversation history (last 6 turns)
        var recentHistory = conversation.Messages
            .OrderBy(m => m.CreatedAt)
            .TakeLast(6);

        foreach (var m in recentHistory)
        {
            if (m.SenderType == SenderType.User) messages.Add(AiChatMessage.User(m.Content));
            else if (m.SenderType == SenderType.Assistant) messages.Add(AiChatMessage.Assistant(m.Content));
        }

        messages.Add(AiChatMessage.User(userMessage));

        try
        {
            var chatResp = await _aiProvider.GenerateChatCompletionAsync(new AiChatRequest
            {
                Messages = messages,
                Temperature = 0.7,
                MaxTokens = 800
            }, ct);

            return string.IsNullOrWhiteSpace(chatResp.Content)
                ? "I am here to help you manage your property, submit maintenance tickets, and pre-register visitors. How can I assist you today?"
                : chatResp.Content.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate AI conversational reply for user {UserName} ({Role}). Falling back to default response.", userName, role);
            return "I am your SmartProperty AI assistant. I can help you report maintenance issues, register visitors, or check ticket statuses. How can I help you today?";
        }
    }

    private static PendingActionDto? TryParsePendingAction(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<PendingActionDto>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return null;
        }
    }
}
