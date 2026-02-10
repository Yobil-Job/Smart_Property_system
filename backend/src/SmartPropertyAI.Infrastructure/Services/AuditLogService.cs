using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.AuditLogs;
using SmartPropertyAI.Application.Features.AuditLogs.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    public AuditLogService(
        ApplicationDbContext context,
        ICurrentUserService currentUserService,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _currentUserService = currentUserService;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<PagedResult<AuditLogSummaryDto>> GetAuditLogsAsync(AuditLogFilterDto filter, CancellationToken ct = default)
    {
        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.EntityType))
        {
            var entityType = filter.EntityType.Trim().ToLower();
            query = query.Where(a => a.EntityType.ToLower() == entityType);
        }

        if (!string.IsNullOrWhiteSpace(filter.Action))
        {
            var action = filter.Action.Trim().ToLower();
            query = query.Where(a => a.Action.ToLower() == action);
        }

        if (filter.UserId.HasValue)
        {
            query = query.Where(a => a.UserId == filter.UserId.Value);
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(a => a.Timestamp >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(a => a.Timestamp <= filter.EndDate.Value);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(a => new AuditLogSummaryDto
            {
                Id = a.Id,
                UserId = a.UserId,
                UserName = a.UserName,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                IpAddress = a.IpAddress,
                Timestamp = a.Timestamp
            })
            .ToListAsync(ct);

        return new PagedResult<AuditLogSummaryDto>(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<AuditLogDetailDto> GetAuditLogByIdAsync(Guid id, CancellationToken ct = default)
    {
        var log = await _context.AuditLogs.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, ct);
        if (log == null)
        {
            throw new NotFoundException("AuditLog", id);
        }

        return new AuditLogDetailDto
        {
            Id = log.Id,
            UserId = log.UserId,
            UserName = log.UserName,
            Action = log.Action,
            EntityType = log.EntityType,
            EntityId = log.EntityId,
            PreviousValues = log.PreviousValues,
            NewValues = log.NewValues,
            IpAddress = log.IpAddress,
            Timestamp = log.Timestamp
        };
    }

    public async Task LogActionAsync(
        string action,
        string entityType,
        string entityId,
        object? previousValues = null,
        object? newValues = null,
        CancellationToken ct = default)
    {
        var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var userId = _currentUserService.UserId;
        var userName = _currentUserService.Email ?? "System";

        var log = new AuditLog
        {
            UserId = userId,
            UserName = userName,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            PreviousValues = previousValues != null ? JsonSerializer.Serialize(previousValues, JsonOptions) : null,
            NewValues = newValues != null ? JsonSerializer.Serialize(newValues, JsonOptions) : null,
            IpAddress = ipAddress,
            Timestamp = DateTime.UtcNow
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync(ct);
    }
}

