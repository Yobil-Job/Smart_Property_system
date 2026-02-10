using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Staff;
using SmartPropertyAI.Application.Features.Staff.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Exceptions;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
public class StaffController : BaseApiController
{
    private readonly IStaffService _staffService;
    private readonly ICurrentUserService _currentUserService;

    public StaffController(IStaffService staffService, ICurrentUserService currentUserService)
    {
        _staffService = staffService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<PagedResult<StaffSummaryDto>>>> GetStaffMembers(
        [FromQuery] StaffFilterDto filter,
        CancellationToken ct)
    {
        var result = await _staffService.GetStaffMembersAsync(filter, ct);
        return OkResponse(result, "Staff members retrieved successfully.");
    }

    [HttpGet("me/tasks")]
    [Authorize(Policy = "RequireStaffRole")]
    public async Task<ActionResult<ApiResponse<StaffTaskOverviewDto>>> GetMyTasks(CancellationToken ct)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            throw new UnauthorizedException("User context could not be resolved from token.");
        }

        var result = await _staffService.GetMyTasksAsync(userId.Value, ct);
        return OkResponse(result, "Staff tasks overview retrieved successfully.");
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<StaffDetailDto>>> GetStaff(Guid id, CancellationToken ct)
    {
        var result = await _staffService.GetStaffByIdAsync(id, ct);
        return OkResponse(result, "Staff details retrieved successfully.");
    }

    [HttpPost]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<StaffDetailDto>>> CreateStaff(
        [FromBody] CreateStaffRequest request,
        CancellationToken ct)
    {
        var result = await _staffService.CreateStaffAsync(request, ct);
        return CreatedResponse(nameof(GetStaff), new { id = result.Id }, result, "Staff member onboarded successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<StaffDetailDto>>> UpdateStaff(
        Guid id,
        [FromBody] UpdateStaffRequest request,
        CancellationToken ct)
    {
        var result = await _staffService.UpdateStaffAsync(id, request, ct);
        return OkResponse(result, "Staff member updated successfully.");
    }
}

