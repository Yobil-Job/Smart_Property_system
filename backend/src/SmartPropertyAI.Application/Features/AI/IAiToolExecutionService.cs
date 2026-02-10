using SmartPropertyAI.Application.Features.Conversations.DTOs;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Application.Features.AI;

public interface IAiToolExecutionService
{
    Task<ConfirmActionResponseDto> ExecutePendingActionAsync(
        ConversationWorkflow workflow,
        Guid userId,
        string role,
        string clientIp,
        CancellationToken ct = default);
}

