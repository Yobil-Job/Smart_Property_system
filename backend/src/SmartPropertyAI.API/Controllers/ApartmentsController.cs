using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Apartments;
using SmartPropertyAI.Application.Features.Apartments.DTOs;
using SmartPropertyAI.Domain.Constants;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
public class ApartmentsController : BaseApiController
{
    private readonly IApartmentService _apartmentService;

    public ApartmentsController(IApartmentService apartmentService)
    {
        _apartmentService = apartmentService;
    }

    [HttpGet("/api/v1/buildings/{buildingId:guid}/apartments")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<PagedResult<ApartmentSummaryDto>>>> GetApartmentsByBuilding(
        Guid buildingId,
        [FromQuery] ApartmentFilterDto filter,
        CancellationToken ct)
    {
        var result = await _apartmentService.GetApartmentsByBuildingIdAsync(buildingId, filter, ct);
        return OkResponse(result, "Apartments retrieved successfully.");
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ApartmentDetailDto>>> GetApartment(Guid id, CancellationToken ct)
    {
        var result = await _apartmentService.GetApartmentByIdAsync(id, ct);
        return OkResponse(result, "Apartment details retrieved successfully.");
    }

    [HttpPost("/api/v1/buildings/{buildingId:guid}/apartments")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<ApartmentDetailDto>>> CreateApartment(
        Guid buildingId,
        [FromBody] CreateApartmentRequest request,
        CancellationToken ct)
    {
        var result = await _apartmentService.CreateApartmentAsync(buildingId, request, ct);
        return CreatedResponse(nameof(GetApartment), new { id = result.Id }, result, "Apartment created successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<ApartmentDetailDto>>> UpdateApartment(
        Guid id,
        [FromBody] UpdateApartmentRequest request,
        CancellationToken ct)
    {
        var result = await _apartmentService.UpdateApartmentAsync(id, request, ct);
        return OkResponse(result, "Apartment updated successfully.");
    }

    [HttpPatch("{id:guid}/occupancy")]
    [Authorize(Policy = "RequireStaffOrAdminRole")]
    public async Task<ActionResult<ApiResponse<ApartmentDetailDto>>> UpdateOccupancy(
        Guid id,
        [FromBody] UpdateOccupancyRequest request,
        CancellationToken ct)
    {
        var result = await _apartmentService.UpdateOccupancyStatusAsync(id, request, ct);
        return OkResponse(result, "Apartment occupancy status updated successfully.");
    }
}

