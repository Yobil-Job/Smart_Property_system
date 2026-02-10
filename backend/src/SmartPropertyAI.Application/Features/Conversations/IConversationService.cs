using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Conversations.DTOs;

namespace SmartPropertyAI.Application.Features.Conversations;

public interface IConversationService
{
    Task<ConversationDetailDto> CreateConversationAsync(
        Guid userId,
        string role,
        CreateConversationRequestDto request,
        CancellationToken ct = default);

    Task<PagedResult<ConversationSummaryDto>> GetConversationsAsync(
        Guid userId,
        string? status,
        int pageNumber,
        int pageSize,
        CancellationToken ct = default);

    Task<ConversationDetailDto> GetConversationByIdAsync(
        Guid conversationId,
        Guid userId,
        CancellationToken ct = default);

    Task<PagedResult<ConversationMessageDto>> GetMessagesAsync(
        Guid conversationId,
        Guid userId,
        int pageNumber,
        int pageSize,
        CancellationToken ct = default);

    Task<bool> DeleteConversationAsync(
        Guid conversationId,
        Guid userId,
        CancellationToken ct = default);
}

