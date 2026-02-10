using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Application.Features.Conversations;
using SmartPropertyAI.Application.Features.Conversations.DTOs;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class ConversationService : IConversationService
{
    private readonly ApplicationDbContext _context;

    public ConversationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ConversationDetailDto> CreateConversationAsync(
        Guid userId,
        string role,
        CreateConversationRequestDto request,
        CancellationToken ct = default)
    {
        var title = string.IsNullOrWhiteSpace(request?.Title)
            ? $"Conversation - {DateTime.UtcNow:MMM d, HH:mm}"
            : request.Title.Trim();

        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Role = role,
            Title = title,
            Status = ConversationStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Add initial system greeting message
        var welcomeMessage = new ConversationMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            SenderType = SenderType.Assistant,
            Content = $"Hello! I am your SmartProperty AI assistant. How can I help you today with your property or maintenance needs?",
            CreatedAt = DateTime.UtcNow
        };
        _context.Conversations.Add(conversation);
        _context.ConversationMessages.Add(welcomeMessage);
        await _context.SaveChangesAsync(ct);

        return MapToDetailDto(conversation);
    }

    public async Task<PagedResult<ConversationSummaryDto>> GetConversationsAsync(
        Guid userId,
        string? status,
        int pageNumber,
        int pageSize,
        CancellationToken ct = default)
    {
        pageNumber = pageNumber <= 0 ? 1 : pageNumber;
        pageSize = pageSize <= 0 ? 20 : pageSize;

        var query = _context.Conversations
            .AsNoTracking()
            .Where(c => c.UserId == userId);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ConversationStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(c => c.Status == parsedStatus);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(c => c.UpdatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new ConversationSummaryDto
            {
                Id = c.Id,
                Title = c.Title,
                Role = c.Role,
                Status = c.Status.ToString(),
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt ?? c.CreatedAt,
                MessageCount = c.Messages.Count
            })
            .ToListAsync(ct);

        return new PagedResult<ConversationSummaryDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<ConversationDetailDto> GetConversationByIdAsync(
        Guid conversationId,
        Guid userId,
        CancellationToken ct = default)
    {
        var conversation = await _context.Conversations
            .Include(c => c.CurrentWorkflow)
            .Include(c => c.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new NotFoundException(nameof(Conversation), conversationId);
        }

        if (conversation.UserId != userId)
        {
            throw new ForbiddenException("You are not authorized to view this conversation.");
        }

        return MapToDetailDto(conversation);
    }

    public async Task<PagedResult<ConversationMessageDto>> GetMessagesAsync(
        Guid conversationId,
        Guid userId,
        int pageNumber,
        int pageSize,
        CancellationToken ct = default)
    {
        pageNumber = pageNumber <= 0 ? 1 : pageNumber;
        pageSize = pageSize <= 0 ? 50 : pageSize;

        var conversation = await _context.Conversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new NotFoundException(nameof(Conversation), conversationId);
        }

        if (conversation.UserId != userId)
        {
            throw new ForbiddenException("You are not authorized to view messages in this conversation.");
        }

        var query = _context.ConversationMessages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId);

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderBy(m => m.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new ConversationMessageDto
            {
                Id = m.Id,
                SenderType = m.SenderType.ToString(),
                Content = m.Content,
                MetadataJson = m.MetadataJson,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<ConversationMessageDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<bool> DeleteConversationAsync(
        Guid conversationId,
        Guid userId,
        CancellationToken ct = default)
    {
        var conversation = await _context.Conversations
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new NotFoundException(nameof(Conversation), conversationId);
        }

        if (conversation.UserId != userId)
        {
            throw new ForbiddenException("You are not authorized to delete this conversation.");
        }

        conversation.IsDeleted = true;
        conversation.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return true;
    }

    private static ConversationDetailDto MapToDetailDto(Conversation c)
    {
        return new ConversationDetailDto
        {
            Id = c.Id,
            Title = c.Title,
            Role = c.Role,
            Status = c.Status.ToString(),
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt ?? c.CreatedAt,
            CurrentWorkflow = c.CurrentWorkflow == null ? null : new ConversationWorkflowDto
            {
                Id = c.CurrentWorkflow.Id,
                Intent = c.CurrentWorkflow.Intent,
                WorkflowType = c.CurrentWorkflow.WorkflowType,
                CollectedFieldsJson = c.CurrentWorkflow.CollectedFieldsJson,
                MissingFieldsJson = c.CurrentWorkflow.MissingFieldsJson,
                PendingActionJson = c.CurrentWorkflow.PendingActionJson,
                PendingAction = !string.IsNullOrWhiteSpace(c.CurrentWorkflow.PendingActionJson)
                    ? JsonSerializer.Deserialize<PendingActionDto>(c.CurrentWorkflow.PendingActionJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                    : null,
                ConfirmationStatus = c.CurrentWorkflow.ConfirmationStatus.ToString(),
                UpdatedAt = c.CurrentWorkflow.UpdatedAt
            },
            Messages = c.Messages.Select(m => new ConversationMessageDto
            {
                Id = m.Id,
                SenderType = m.SenderType.ToString(),
                Content = m.Content,
                MetadataJson = m.MetadataJson,
                CreatedAt = m.CreatedAt
            }).ToList()
        };
    }
}
