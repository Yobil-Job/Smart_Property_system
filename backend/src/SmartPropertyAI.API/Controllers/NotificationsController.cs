using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Notifications;
using SmartPropertyAI.Application.Features.Notifications.DTOs;
using SmartPropertyAI.Application.Interfaces;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
[Route("api/v1/notifications")]
public class NotificationsController : BaseApiController
{
    private readonly INotificationService _notificationService;
    private readonly ICurrentUserService _currentUserService;

    public NotificationsController(INotificationService notificationService, ICurrentUserService currentUserService)
    {
        _notificationService = notificationService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<NotificationDto>>>> GetNotifications(
        [FromQuery] bool? unreadOnly = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var userId = _currentUserService.UserId ?? Guid.Empty;
        var result = await _notificationService.GetUserNotificationsAsync(userId, unreadOnly, pageNumber, pageSize, ct);
        return OkResponse(result, "Notifications retrieved successfully");
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<NotificationDto>>> GetNotification(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        var userId = _currentUserService.UserId ?? Guid.Empty;
        var result = await _notificationService.GetNotificationByIdAsync(id, userId, ct);
        return OkResponse(result, "Notification retrieved successfully");
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<ActionResult<ApiResponse<NotificationDto>>> MarkAsRead(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        var userId = _currentUserService.UserId ?? Guid.Empty;
        var result = await _notificationService.MarkAsReadAsync(id, userId, ct);
        return OkResponse(result, "Notification marked as read");
    }

    [HttpPatch("read-all")]
    public async Task<ActionResult<ApiResponse<BulkReadResultDto>>> MarkAllAsRead(CancellationToken ct)
    {
        var userId = _currentUserService.UserId ?? Guid.Empty;
        var result = await _notificationService.MarkAllAsReadAsync(userId, ct);
        return OkResponse(result, "All notifications marked as read");
    }
}

