using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.AI.DTOs;
using SmartPropertyAI.Application.Features.Conversations;
using SmartPropertyAI.Application.Features.Conversations.DTOs;
using SmartPropertyAI.Application.Interfaces;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
[Route("api/v1/ai")]
public class AiChatController : BaseApiController
{
    private readonly IAiOrchestratorService _orchestratorService;
    private readonly IConversationService _conversationService;
    private readonly IAiToolRegistry _toolRegistry;
    private readonly ICurrentUserService _currentUserService;

    private Guid CurrentUserId => _currentUserService.UserId ?? Guid.Empty;

    public AiChatController(
        IAiOrchestratorService orchestratorService,
        IConversationService conversationService,
        IAiToolRegistry toolRegistry,
        ICurrentUserService currentUserService)
    {
        _orchestratorService = orchestratorService;
        _conversationService = conversationService;
        _toolRegistry = toolRegistry;
        _currentUserService = currentUserService;
    }

    [HttpGet("tools")]
    public ActionResult<ApiResponse<IReadOnlyList<AiToolDefinition>>> GetTools()
    {
        var role = _currentUserService.Roles.FirstOrDefault() ?? "Resident";
        var tools = _toolRegistry.GetToolsForRole(role);
        return OkResponse(tools, $"Retrieved {tools.Count} tools for role {role}");
    }

    [HttpPost("chat")]
    public async Task<ActionResult<ApiResponse<AiChatResponseDto>>> Chat(
        [FromBody] AiChatRequestDto request,
        CancellationToken ct)
    {
        var userId = CurrentUserId;
        var role = _currentUserService.Roles.FirstOrDefault() ?? "Resident";
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var userName = _currentUserService.Email ?? "User";

        var response = await _orchestratorService.ProcessChatTurnAsync(
            request,
            userId,
            role,
            userName,
            clientIp,
            ct);

        return OkResponse(response, "AI response generated.");
    }

    [HttpPost("conversations")]
    public async Task<ActionResult<ApiResponse<ConversationDetailDto>>> CreateConversation(
        [FromBody] CreateConversationRequestDto request,
        CancellationToken ct)
    {
        var userId = CurrentUserId;
        var role = _currentUserService.Roles.FirstOrDefault() ?? "Resident";

        var response = await _conversationService.CreateConversationAsync(userId, role, request, ct);
        return CreatedResponse(nameof(GetConversation), new { id = response.Id }, response, "Conversation created successfully.");
    }

    [HttpGet("conversations")]
    public async Task<ActionResult<ApiResponse<PagedResult<ConversationSummaryDto>>>> GetConversations(
        [FromQuery] string? status = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var userId = CurrentUserId;
        var response = await _conversationService.GetConversationsAsync(userId, status, pageNumber, pageSize, ct);
        return OkResponse(response, "Conversations retrieved successfully.");
    }

    [HttpGet("conversations/{id:guid}", Name = nameof(GetConversation))]
    public async Task<ActionResult<ApiResponse<ConversationDetailDto>>> GetConversation(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        var userId = CurrentUserId;
        var response = await _conversationService.GetConversationByIdAsync(id, userId, ct);
        return OkResponse(response, "Conversation retrieved successfully.");
    }

    [HttpGet("conversations/{id:guid}/messages")]
    public async Task<ActionResult<ApiResponse<PagedResult<ConversationMessageDto>>>> GetMessages(
        [FromRoute] Guid id,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var userId = CurrentUserId;
        var response = await _conversationService.GetMessagesAsync(id, userId, pageNumber, pageSize, ct);
        return OkResponse(response, "Conversation messages retrieved successfully.");
    }

    [HttpPost("conversations/{id:guid}/messages")]
    public async Task<ActionResult<ApiResponse<AiChatResponseDto>>> SendMessage(
        [FromRoute] Guid id,
        [FromBody] CreateConversationMessageRequest request,
        CancellationToken ct)
    {
        var userId = CurrentUserId;
        var role = _currentUserService.Roles.FirstOrDefault() ?? "Resident";
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var userName = _currentUserService.Email ?? "User";

        var chatReq = new AiChatRequestDto
        {
            ConversationId = id,
            Message = request.Message
        };

        var response = await _orchestratorService.ProcessChatTurnAsync(
            chatReq,
            userId,
            role,
            userName,
            clientIp,
            ct);

        return OkResponse(response, "AI response generated.");
    }

    [HttpPost("conversations/{id:guid}/confirm")]
    public async Task<ActionResult<ApiResponse<ConfirmActionResponseDto>>> ConfirmAction(
        [FromRoute] Guid id,
        [FromBody] ConfirmActionRequestDto request,
        CancellationToken ct)
    {
        var userId = CurrentUserId;
        var role = _currentUserService.Roles.FirstOrDefault() ?? "Resident";
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        var response = await _orchestratorService.ConfirmPendingActionAsync(
            id,
            userId,
            role,
            clientIp,
            ct);

        return OkResponse(response, response.Message);
    }

    [HttpPost("conversations/{id:guid}/cancel")]
    public async Task<ActionResult<ApiResponse<object>>> CancelAction(
        [FromRoute] Guid id,
        [FromBody] CancelActionRequestDto request,
        CancellationToken ct)
    {
        var userId = CurrentUserId;
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        await _orchestratorService.CancelPendingActionAsync(
            id,
            userId,
            request?.Reason,
            clientIp,
            ct);

        return OkResponse<object>(new { cancelled = true, reason = request?.Reason }, "Pending action cancelled.");
    }

    [HttpDelete("conversations/{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteConversation(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        var userId = CurrentUserId;
        await _conversationService.DeleteConversationAsync(id, userId, ct);
        return OkResponse<object>(new { deleted = true }, "Conversation archived successfully.");
    }
}

public class CreateConversationMessageRequest
{
    public string Message { get; set; } = string.Empty;
}
