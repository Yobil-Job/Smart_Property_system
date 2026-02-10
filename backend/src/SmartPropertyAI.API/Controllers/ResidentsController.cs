using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Apartments.DTOs;
using SmartPropertyAI.Application.Features.Residents;
using SmartPropertyAI.Application.Features.Residents.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Exceptions;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
public class ResidentsController : BaseApiController
{
    private readonly IResidentService _residentService;
    private readonly ICurrentUserService _currentUserService;

    public ResidentsController(IResidentService residentService, ICurrentUserService currentUserService)
    {
        _residentService = residentService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<PagedResult<ResidentSummaryDto>>>> GetResidents(
        [FromQuery] ResidentFilterDto filter,
        CancellationToken ct)
    {
        var result = await _residentService.GetResidentsAsync(filter, ct);
        return OkResponse(result, "Residents retrieved successfully.");
    }

    [HttpGet("me")]
    [Authorize(Policy = "RequireResidentRole")]
    public async Task<ActionResult<ApiResponse<ResidentDetailDto>>> GetMyProfile(CancellationToken ct)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            throw new UnauthorizedException("User context could not be resolved from token.");
        }

        var result = await _residentService.GetResidentByUserIdAsync(userId.Value, ct);
        return OkResponse(result, "Resident profile retrieved successfully.");
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ResidentDetailDto>>> GetResident(Guid id, CancellationToken ct)
    {
        var result = await _residentService.GetResidentByIdAsync(id, ct);
        return OkResponse(result, "Resident details retrieved successfully.");
    }

    [HttpPost]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<ResidentDetailDto>>> CreateResident(
        [FromBody] CreateResidentRequest request,
        CancellationToken ct)
    {
        var result = await _residentService.CreateResidentAsync(request, ct);
        return CreatedResponse(nameof(GetResident), new { id = result.Id }, result, "Resident registered and assigned to apartment successfully.");
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ResidentDetailDto>>> UpdateResident(
        Guid id,
        [FromBody] UpdateResidentRequest request,
        CancellationToken ct)
    {
        var result = await _residentService.UpdateResidentAsync(id, request, ct);
        return OkResponse(result, "Resident updated successfully.");
    }

    [HttpGet("{id:guid}/apartment")]
    public async Task<ActionResult<ApiResponse<ApartmentDetailDto>>> GetResidentApartment(Guid id, CancellationToken ct)
    {
        var result = await _residentService.GetApartmentForResidentAsync(id, ct);
        return OkResponse(result, "Resident apartment details retrieved successfully.");
    }
}

