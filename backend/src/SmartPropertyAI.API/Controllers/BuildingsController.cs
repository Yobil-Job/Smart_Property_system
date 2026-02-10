using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Buildings;
using SmartPropertyAI.Application.Features.Buildings.DTOs;
using SmartPropertyAI.Domain.Constants;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
public class BuildingsController : BaseApiController
{
    private readonly IBuildingService _buildingService;

    public BuildingsController(IBuildingService buildingService)
    {
        _buildingService = buildingService;
    }

    [HttpGet("/api/v1/properties/{propertyId:guid}/buildings")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<List<BuildingSummaryDto>>>> GetBuildingsByProperty(Guid propertyId, CancellationToken ct)
    {
        var result = await _buildingService.GetBuildingsByPropertyIdAsync(propertyId, ct);
        return OkResponse(result, "Buildings retrieved successfully.");
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<BuildingDetailDto>>> GetBuilding(Guid id, CancellationToken ct)
    {
        var result = await _buildingService.GetBuildingByIdAsync(id, ct);
        return OkResponse(result, "Building details retrieved successfully.");
    }

    [HttpPost("/api/v1/properties/{propertyId:guid}/buildings")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<BuildingDetailDto>>> CreateBuilding(Guid propertyId, [FromBody] CreateBuildingRequest request, CancellationToken ct)
    {
        var result = await _buildingService.CreateBuildingAsync(propertyId, request, ct);
        return CreatedResponse(nameof(GetBuilding), new { id = result.Id }, result, "Building created successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<BuildingDetailDto>>> UpdateBuilding(Guid id, [FromBody] UpdateBuildingRequest request, CancellationToken ct)
    {
        var result = await _buildingService.UpdateBuildingAsync(id, request, ct);
        return OkResponse(result, "Building updated successfully.");
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse>> DeleteBuilding(Guid id, CancellationToken ct)
    {
        await _buildingService.DeleteBuildingAsync(id, ct);
        return OkMessage("Building deleted/archived successfully.");
    }
}

