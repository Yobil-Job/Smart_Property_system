using SmartPropertyAI.Application.Features.Conversations.DTOs;

namespace SmartPropertyAI.Application.Features.AI;

public interface IAiOrchestratorService
{
    Task<AiChatResponseDto> ProcessChatTurnAsync(
        AiChatRequestDto request,
        Guid userId,
        string userRole,
        string userName,
        string clientIp,
        CancellationToken ct = default);

    Task<ConfirmActionResponseDto> ConfirmPendingActionAsync(
        Guid conversationId,
        Guid userId,
        string userRole,
        string clientIp,
        CancellationToken ct = default);

    Task<bool> CancelPendingActionAsync(
        Guid conversationId,
        Guid userId,
        string? reason,
        string clientIp,
        CancellationToken ct = default);
}

