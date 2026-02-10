using SmartPropertyAI.Application.Features.Analytics.DTOs;

namespace SmartPropertyAI.Application.Features.Analytics;

public interface IAnalyticsService
{
    Task<MaintenanceAnalyticsDto> GetMaintenanceAnalyticsAsync(AnalyticsDateFilterDto filter, CancellationToken ct = default);
    Task<VisitorAnalyticsDto> GetVisitorAnalyticsAsync(AnalyticsDateFilterDto filter, CancellationToken ct = default);
    Task<OccupancyAnalyticsDto> GetOccupancyAnalyticsAsync(Guid? propertyId, CancellationToken ct = default);
}

