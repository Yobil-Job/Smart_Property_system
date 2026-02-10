using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Visitors;
using SmartPropertyAI.Application.Features.Visitors.DTOs;
using SmartPropertyAI.Domain.Constants;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
public class VisitorsController : BaseApiController
{
    private readonly IVisitorService _visitorService;

    public VisitorsController(IVisitorService visitorService)
    {
        _visitorService = visitorService;
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<VisitorDetailDto>>> CreateVisitor(
        [FromBody] CreateVisitorRequest request,
        CancellationToken ct)
    {
        var result = await _visitorService.CreateVisitorAsync(request, ct);
        return CreatedResponse(nameof(GetVisitor), new { id = result.Id }, result, "Visitor pre-registered successfully.");
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<VisitorSummaryDto>>>> GetVisitors(
        [FromQuery] VisitorFilterDto filter,
        CancellationToken ct)
    {
        if (User.IsInRole(UserRoles.Resident) && !User.IsInRole(UserRoles.Administrator) && !User.IsInRole(UserRoles.Staff))
        {
            var myVisitors = await _visitorService.GetMyVisitorsAsync(filter.PageNumber, filter.PageSize, ct);
            return OkResponse(myVisitors, "Resident visitors retrieved successfully.");
        }

        var result = await _visitorService.GetVisitorsAsync(filter, ct);
        return OkResponse(result, "Visitors retrieved successfully.");
    }

    [HttpGet("my-visitors")]
    [Authorize(Policy = "RequireResidentRole")]
    public async Task<ActionResult<ApiResponse<PagedResult<VisitorSummaryDto>>>> GetMyVisitors(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        var result = await _visitorService.GetMyVisitorsAsync(pageNumber, pageSize, ct);
        return OkResponse(result, "Resident visitors retrieved successfully.");
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<VisitorDetailDto>>> GetVisitor(Guid id, CancellationToken ct)
    {
        var result = await _visitorService.GetVisitorByIdAsync(id, ct);
        return OkResponse(result, "Visitor details retrieved successfully.");
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<VisitorDetailDto>>> UpdateVisitor(
        Guid id,
        [FromBody] UpdateVisitorRequest request,
        CancellationToken ct)
    {
        var result = await _visitorService.UpdateVisitorAsync(id, request, ct);
        return OkResponse(result, "Visitor details updated successfully.");
    }

    [HttpPatch("{id:guid}/approve")]
    [Authorize(Policy = "RequireStaffOrAdminRole")]
    public async Task<ActionResult<ApiResponse<VisitorDetailDto>>> ApproveVisitor(Guid id, CancellationToken ct)
    {
        var result = await _visitorService.ApproveVisitorAsync(id, ct);
        return OkResponse(result, "Visitor pass approved.");
    }

    [HttpPatch("{id:guid}/reject")]
    [Authorize(Policy = "RequireStaffOrAdminRole")]
    public async Task<ActionResult<ApiResponse<VisitorDetailDto>>> RejectVisitor(Guid id, CancellationToken ct)
    {
        var result = await _visitorService.RejectVisitorAsync(id, ct);
        return OkResponse(result, "Visitor pass rejected.");
    }

    [HttpPatch("{id:guid}/check-in")]
    [Authorize(Policy = "RequireStaffOrAdminRole")]
    public async Task<ActionResult<ApiResponse<VisitorDetailDto>>> CheckInVisitor(Guid id, CancellationToken ct)
    {
        var result = await _visitorService.CheckInVisitorAsync(id, ct);
        return OkResponse(result, "Visitor checked in successfully.");
    }

    [HttpPatch("{id:guid}/check-out")]
    [Authorize(Policy = "RequireStaffOrAdminRole")]
    public async Task<ActionResult<ApiResponse<VisitorDetailDto>>> CheckOutVisitor(Guid id, CancellationToken ct)
    {
        var result = await _visitorService.CheckOutVisitorAsync(id, ct);
        return OkResponse(result, "Visitor checked out successfully.");
    }
}

