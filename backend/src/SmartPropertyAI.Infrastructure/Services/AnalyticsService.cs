using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartPropertyAI.Application.Features.Analytics;
using SmartPropertyAI.Application.Features.Analytics.DTOs;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AnalyticsService> _logger;

    public AnalyticsService(ApplicationDbContext context, ILogger<AnalyticsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<MaintenanceAnalyticsDto> GetMaintenanceAnalyticsAsync(
        AnalyticsDateFilterDto filter,
        CancellationToken ct = default)
    {
        _logger.LogInformation("Calculating maintenance analytics (Property: {PropertyId})", filter.PropertyId);

        var query = _context.MaintenanceRequests
            .Include(m => m.Apartment)
            .ThenInclude(a => a.Building)
            .AsNoTracking();

        if (filter.PropertyId.HasValue)
        {
            var pid = filter.PropertyId.Value;
            query = query.Where(m => m.Apartment.Building.PropertyId == pid);
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(m => m.CreatedAt >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(m => m.CreatedAt <= filter.EndDate.Value);
        }

        var totalRequests = await query.CountAsync(ct);

        var byCatList = await query
            .GroupBy(m => m.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var byCategory = byCatList.ToDictionary(k => k.Category.ToString(), v => v.Count);

        var byPriList = await query
            .GroupBy(m => m.Priority)
            .Select(g => new { Priority = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var byPriority = byPriList.ToDictionary(k => k.Priority.ToString(), v => v.Count);

        var resolvedRequests = await query
            .Where(m => (m.Status == MaintenanceStatus.Resolved || m.Status == MaintenanceStatus.Closed) && m.ResolvedAt != null)
            .Select(m => new { m.CreatedAt, ResolvedAt = m.ResolvedAt!.Value })
            .ToListAsync(ct);

        var avgResolutionHours = resolvedRequests.Count > 0
            ? Math.Round(resolvedRequests.Average(r => (r.ResolvedAt - r.CreatedAt).TotalHours), 1)
            : 0.0;

        var resolutionRate = totalRequests > 0
            ? Math.Round((double)resolvedRequests.Count / totalRequests * 100.0, 1)
            : 0.0;

        return new MaintenanceAnalyticsDto
        {
            TotalRequests = totalRequests,
            AverageResolutionHours = avgResolutionHours,
            ByCategory = byCategory,
            ByPriority = byPriority,
            ResolutionRatePercentage = resolutionRate
        };
    }

    public async Task<VisitorAnalyticsDto> GetVisitorAnalyticsAsync(
        AnalyticsDateFilterDto filter,
        CancellationToken ct = default)
    {
        _logger.LogInformation("Calculating visitor analytics (Property: {PropertyId})", filter.PropertyId);

        var query = _context.Visitors
            .Include(v => v.Resident)
            .ThenInclude(r => r.Apartment)
            .ThenInclude(a => a.Building)
            .AsNoTracking();

        if (filter.PropertyId.HasValue)
        {
            var pid = filter.PropertyId.Value;
            query = query.Where(v => v.Resident.Apartment.Building.PropertyId == pid);
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(v => v.CreatedAt >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(v => v.CreatedAt <= filter.EndDate.Value);
        }

        var totalVisitors = await query.CountAsync(ct);

        var approvedCount = await query.CountAsync(v =>
            v.Status == VisitorStatus.Approved ||
            v.Status == VisitorStatus.CheckedIn ||
            v.Status == VisitorStatus.CheckedOut, ct);

        var rejectedCount = await query.CountAsync(v => v.Status == VisitorStatus.Rejected, ct);

        var arrivalHours = await query
            .Select(v => v.ExpectedArrival.Hour)
            .ToListAsync(ct);

        var peakHour = "14:00 - 16:00";
        if (arrivalHours.Count > 0)
        {
            var peak = arrivalHours.GroupBy(h => h).OrderByDescending(g => g.Count()).First().Key;
            peakHour = $"{peak:D2}:00 - {(peak + 2) % 24:D2}:00";
        }

        var completedVisits = await query
            .Where(v => v.CheckedInAt != null && v.CheckedOutAt != null)
            .Select(v => new { In = v.CheckedInAt!.Value, Out = v.CheckedOutAt!.Value })
            .ToListAsync(ct);

        var avgDurationMinutes = completedVisits.Count > 0
            ? Math.Round(completedVisits.Average(v => (v.Out - v.In).TotalMinutes), 1)
            : 0.0;

        return new VisitorAnalyticsDto
        {
            TotalVisitors = totalVisitors,
            ApprovedCount = approvedCount,
            RejectedCount = rejectedCount,
            PeakHour = peakHour,
            AverageDurationMinutes = avgDurationMinutes
        };
    }

    public async Task<OccupancyAnalyticsDto> GetOccupancyAnalyticsAsync(
        Guid? propertyId,
        CancellationToken ct = default)
    {
        _logger.LogInformation("Calculating occupancy analytics (Property: {PropertyId})", propertyId);

        var query = _context.Apartments
            .Include(a => a.Building)
            .AsNoTracking();

        if (propertyId.HasValue)
        {
            var pid = propertyId.Value;
            query = query.Where(a => a.Building.PropertyId == pid);
        }

        var totalUnits = await query.CountAsync(ct);
        var occupiedUnits = await query.CountAsync(a => a.OccupancyStatus == OccupancyStatus.Occupied, ct);
        var vacantUnits = await query.CountAsync(a => a.OccupancyStatus == OccupancyStatus.Vacant, ct);
        var underMaintenanceUnits = await query.CountAsync(a => a.OccupancyStatus == OccupancyStatus.UnderMaintenance, ct);

        var occupancyPercentage = totalUnits > 0
            ? Math.Round((double)occupiedUnits / totalUnits * 100.0, 2)
            : 0.0;

        return new OccupancyAnalyticsDto
        {
            TotalUnits = totalUnits,
            OccupiedUnits = occupiedUnits,
            VacantUnits = vacantUnits,
            UnderMaintenanceUnits = underMaintenanceUnits,
            OccupancyPercentage = occupancyPercentage
        };
    }
}

