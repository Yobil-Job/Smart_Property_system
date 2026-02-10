using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Dashboard;
using SmartPropertyAI.Application.Features.Dashboard.DTOs;
using SmartPropertyAI.Application.Interfaces;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
[Route("api/v1/dashboard")]
public class DashboardController : BaseApiController
{
    private readonly IDashboardService _dashboardService;
    private readonly ICurrentUserService _currentUserService;

    public DashboardController(IDashboardService dashboardService, ICurrentUserService currentUserService)
    {
        _dashboardService = dashboardService;
        _currentUserService = currentUserService;
    }

    [HttpGet("admin")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<AdminDashboardDto>>> GetAdminDashboard(
        [FromQuery] Guid? propertyId,
        CancellationToken ct)
    {
        var result = await _dashboardService.GetAdminDashboardAsync(propertyId, ct);
        return OkResponse(result, "Admin dashboard loaded");
    }

    [HttpGet("staff")]
    [Authorize(Policy = "RequireStaffRole")]
    public async Task<ActionResult<ApiResponse<StaffDashboardDto>>> GetStaffDashboard(CancellationToken ct)
    {
        var staffUserId = _currentUserService.UserId ?? Guid.Empty;
        var result = await _dashboardService.GetStaffDashboardAsync(staffUserId, ct);
        return OkResponse(result, "Staff dashboard loaded");
    }

    [HttpGet("resident")]
    [Authorize(Policy = "RequireResidentRole")]
    public async Task<ActionResult<ApiResponse<ResidentDashboardDto>>> GetResidentDashboard(CancellationToken ct)
    {
        var residentUserId = _currentUserService.UserId ?? Guid.Empty;
        var result = await _dashboardService.GetResidentDashboardAsync(residentUserId, ct);
        return OkResponse(result, "Resident dashboard loaded");
    }
}

