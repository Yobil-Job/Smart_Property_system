using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.AuditLogs;
using SmartPropertyAI.Application.Features.Conversations.DTOs;
using SmartPropertyAI.Application.Features.Maintenance;
using SmartPropertyAI.Application.Features.Maintenance.DTOs;
using SmartPropertyAI.Application.Features.Visitors;
using SmartPropertyAI.Application.Features.Visitors.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.AI;

public class AiToolExecutionService : IAiToolExecutionService
{
    private readonly ApplicationDbContext _context;
    private readonly IMaintenanceService _maintenanceService;
    private readonly IVisitorService _visitorService;
    private readonly IAuditLogService _auditLogService;
    private readonly ICurrentUserService _currentUserService;

    public AiToolExecutionService(
        ApplicationDbContext context,
        IMaintenanceService maintenanceService,
        IVisitorService visitorService,
        IAuditLogService auditLogService,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _maintenanceService = maintenanceService;
        _visitorService = visitorService;
        _auditLogService = auditLogService;
        _currentUserService = currentUserService;
    }

    public async Task<ConfirmActionResponseDto> ExecutePendingActionAsync(
        ConversationWorkflow workflow,
        Guid userId,
        string role,
        string clientIp,
        CancellationToken ct = default)
    {
        // 1. Idempotency check
        if (workflow.ConfirmationStatus == ConfirmationStatus.Confirmed)
        {
            throw new ConflictException("This pending action has already been confirmed and executed.");
        }

        if (string.IsNullOrWhiteSpace(workflow.PendingActionJson))
        {
            throw new ValidationException("PendingAction", "No pending action found for this workflow.");
        }

        PendingActionDto pendingAction;
        try
        {
            pendingAction = JsonSerializer.Deserialize<PendingActionDto>(
                workflow.PendingActionJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new JsonException("Deserialized action is null");
        }
        catch (Exception ex)
        {
            throw new ValidationException("PendingAction", $"Invalid action payload: {ex.Message}");
        }

        ConfirmActionResponseDto result;

        if (string.Equals(pendingAction.ActionType, "CreateMaintenanceRequest", StringComparison.OrdinalIgnoreCase))
        {
            result = await ExecuteCreateMaintenanceRequestAsync(pendingAction, ct);
        }
        else if (string.Equals(pendingAction.ActionType, "RegisterVisitor", StringComparison.OrdinalIgnoreCase))
        {
            result = await ExecuteRegisterVisitorAsync(pendingAction, ct);
        }
        else
        {
            throw new ValidationException("ActionType", $"Unsupported AI action type: {pendingAction.ActionType}");
        }

        // 2. Mark workflow as confirmed
        workflow.ConfirmationStatus = ConfirmationStatus.Confirmed;
        workflow.UpdatedAt = DateTime.UtcNow;

        // 3. Log AI execution in system audit trail
        await _auditLogService.LogActionAsync(
            action: "AI_Assistant_Execution",
            entityType: pendingAction.ActionType,
            entityId: result.EntityId.ToString(),
            previousValues: null,
            newValues: pendingAction.Parameters,
            ct: ct);

        await _context.SaveChangesAsync(ct);

        return result;
    }

    private async Task<ConfirmActionResponseDto> ExecuteCreateMaintenanceRequestAsync(
        PendingActionDto action,
        CancellationToken ct)
    {
        var p = action.Parameters;
        var title = p.TryGetValue("title", out var t) && t != null ? t.ToString()! : "Maintenance Request";
        var desc = p.TryGetValue("description", out var d) && d != null ? d.ToString()! : title;
        var catStr = p.TryGetValue("category", out var c) && c != null ? c.ToString()! : "Other";
        var priStr = p.TryGetValue("priority", out var pr) && pr != null ? pr.ToString()! : "Medium";

        if (!Enum.TryParse<MaintenanceCategory>(catStr, true, out var category))
        {
            category = MaintenanceCategory.Other;
        }

        if (!Enum.TryParse<MaintenancePriority>(priStr, true, out var priority))
        {
            priority = MaintenancePriority.Medium;
        }

        var req = new CreateMaintenanceRequest
        {
            Title = title,
            Description = desc,
            Category = category.ToString(),
            Priority = priority.ToString()
        };

        var created = await _maintenanceService.CreateRequestAsync(req, ct);
        var shortId = created.Id.ToString("N").Substring(0, 8).ToUpperInvariant();

        return new ConfirmActionResponseDto
        {
            ActionExecuted = "CreateMaintenanceRequest",
            EntityId = created.Id,
            Status = created.Status.ToString(),
            TicketNumber = $"REQ-{shortId}",
            Message = "Maintenance request created successfully via AI assistant."
        };
    }

    private async Task<ConfirmActionResponseDto> ExecuteRegisterVisitorAsync(
        PendingActionDto action,
        CancellationToken ct)
    {
        var p = action.Parameters;
        var visitorName = p.TryGetValue("visitorName", out var vn) && vn != null ? vn.ToString()! : "Visitor";
        var purpose = p.TryGetValue("purpose", out var pu) && pu != null ? pu.ToString()! : "Visit";
        var arrivalStr = p.TryGetValue("expectedArrival", out var ea) && ea != null ? ea.ToString()! : DateTime.UtcNow.AddHours(2).ToString("o");

        DateTime expectedArrival = DateTime.TryParse(arrivalStr, out var parsedDate) ? parsedDate.ToUniversalTime() : DateTime.UtcNow.AddHours(2);
        DateTime expectedDeparture = expectedArrival.AddHours(4);

        var req = new CreateVisitorRequest
        {
            VisitorName = visitorName,
            Purpose = purpose,
            ExpectedArrival = expectedArrival,
            ExpectedDeparture = expectedDeparture
        };

        var created = await _visitorService.CreateVisitorAsync(req, ct);
        var shortId = created.Id.ToString("N").Substring(0, 8).ToUpperInvariant();

        return new ConfirmActionResponseDto
        {
            ActionExecuted = "RegisterVisitor",
            EntityId = created.Id,
            Status = created.Status.ToString(),
            TicketNumber = $"VIS-{shortId}",
            Message = "Visitor pass registered successfully via AI assistant."
        };
    }
}
