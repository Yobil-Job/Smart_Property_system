using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Analytics;
using SmartPropertyAI.Application.Features.Analytics.DTOs;

namespace SmartPropertyAI.API.Controllers;

[Authorize(Policy = "RequireAdminRole")]
[Route("api/v1/analytics")]
public class AnalyticsController : BaseApiController
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("maintenance")]
    public async Task<ActionResult<ApiResponse<MaintenanceAnalyticsDto>>> GetMaintenanceAnalytics(
        [FromQuery] AnalyticsDateFilterDto filter,
        CancellationToken ct)
    {
        var result = await _analyticsService.GetMaintenanceAnalyticsAsync(filter, ct);
        return OkResponse(result, "Maintenance analytics retrieved");
    }

    [HttpGet("visitors")]
    public async Task<ActionResult<ApiResponse<VisitorAnalyticsDto>>> GetVisitorAnalytics(
        [FromQuery] AnalyticsDateFilterDto filter,
        CancellationToken ct)
    {
        var result = await _analyticsService.GetVisitorAnalyticsAsync(filter, ct);
        return OkResponse(result, "Visitor analytics retrieved");
    }

    [HttpGet("occupancy")]
    public async Task<ActionResult<ApiResponse<OccupancyAnalyticsDto>>> GetOccupancyAnalytics(
        [FromQuery] Guid? propertyId,
        CancellationToken ct)
    {
        var result = await _analyticsService.GetOccupancyAnalyticsAsync(propertyId, ct);
        return OkResponse(result, "Occupancy analytics retrieved");
    }
}

