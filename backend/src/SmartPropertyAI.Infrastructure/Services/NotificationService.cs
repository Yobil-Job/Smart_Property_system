using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Notifications;
using SmartPropertyAI.Application.Features.Notifications.DTOs;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(ApplicationDbContext context, ILogger<NotificationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<NotificationDto> CreateNotificationAsync(
        Guid userId,
        string title,
        string message,
        NotificationType type,
        CancellationToken ct = default)
    {
        _logger.LogInformation("Creating notification for user: {UserId}, Type: {Type}", userId, type);

        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            NotificationType = type,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync(ct);

        return MapToDto(notification);
    }

    public async Task SendNotificationAsync(
        Guid userId,
        string title,
        string message,
        NotificationType type = NotificationType.Information,
        CancellationToken ct = default)
    {
        await CreateNotificationAsync(userId, title, message, type, ct);
    }

    public async Task<PagedResult<NotificationDto>> GetUserNotificationsAsync(
        Guid userId,
        bool? unreadOnly,
        int pageNumber,
        int pageSize,
        CancellationToken ct = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Notifications
            .Where(n => n.UserId == userId)
            .AsNoTracking();

        if (unreadOnly == true)
        {
            query = query.Where(n => !n.IsRead);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                UserId = n.UserId,
                Title = n.Title,
                Message = n.Message,
                NotificationType = n.NotificationType.ToString(),
                IsRead = n.IsRead,
                ReadAt = n.ReadAt,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<NotificationDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<NotificationDto> GetNotificationByIdAsync(
        Guid notificationId,
        Guid userId,
        CancellationToken ct = default)
    {
        var notification = await _context.Notifications
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == notificationId, ct);

        if (notification == null)
        {
            throw new NotFoundException("Notification", notificationId);
        }

        if (notification.UserId != userId)
        {
            throw new ForbiddenException("You do not have permission to view this notification.");
        }

        return MapToDto(notification);
    }

    public async Task<NotificationDto> MarkAsReadAsync(
        Guid notificationId,
        Guid userId,
        CancellationToken ct = default)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId, ct);

        if (notification == null)
        {
            throw new NotFoundException("Notification", notificationId);
        }

        if (notification.UserId != userId)
        {
            throw new ForbiddenException("You do not have permission to modify this notification.");
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }

        return MapToDto(notification);
    }

    public async Task<BulkReadResultDto> MarkAllAsReadAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        var unread = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync(ct);

        if (unread.Count == 0)
        {
            return new BulkReadResultDto { MarkedCount = 0 };
        }

        var now = DateTime.UtcNow;
        foreach (var notification in unread)
        {
            notification.IsRead = true;
            notification.ReadAt = now;
        }

        await _context.SaveChangesAsync(ct);
        return new BulkReadResultDto { MarkedCount = unread.Count };
    }

    private static NotificationDto MapToDto(Notification n) => new()
    {
        Id = n.Id,
        UserId = n.UserId,
        Title = n.Title,
        Message = n.Message,
        NotificationType = n.NotificationType.ToString(),
        IsRead = n.IsRead,
        ReadAt = n.ReadAt,
        CreatedAt = n.CreatedAt
    };
}
