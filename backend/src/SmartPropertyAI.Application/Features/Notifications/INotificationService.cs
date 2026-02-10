using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Notifications.DTOs;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Application.Features.Notifications;

public interface INotificationService
{
    Task<NotificationDto> CreateNotificationAsync(Guid userId, string title, string message, NotificationType type, CancellationToken ct = default);
    Task SendNotificationAsync(Guid userId, string title, string message, NotificationType type = NotificationType.Information, CancellationToken ct = default);
    Task<PagedResult<NotificationDto>> GetUserNotificationsAsync(Guid userId, bool? unreadOnly, int pageNumber, int pageSize, CancellationToken ct = default);
    Task<NotificationDto> GetNotificationByIdAsync(Guid notificationId, Guid userId, CancellationToken ct = default);
    Task<NotificationDto> MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default);
    Task<BulkReadResultDto> MarkAllAsReadAsync(Guid userId, CancellationToken ct = default);
}
