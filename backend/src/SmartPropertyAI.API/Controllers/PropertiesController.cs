using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Properties;
using SmartPropertyAI.Application.Features.Properties.DTOs;
using SmartPropertyAI.Domain.Constants;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
public class PropertiesController : BaseApiController
{
    private readonly IPropertyService _propertyService;

    public PropertiesController(IPropertyService propertyService)
    {
        _propertyService = propertyService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<PagedResult<PropertySummaryDto>>>> GetProperties([FromQuery] PropertyFilterDto filter, CancellationToken ct)
    {
        var result = await _propertyService.GetPropertiesAsync(filter, ct);
        return OkResponse(result, "Properties retrieved successfully.");
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<PropertyDetailDto>>> GetProperty(Guid id, CancellationToken ct)
    {
        var result = await _propertyService.GetPropertyByIdAsync(id, ct);
        return OkResponse(result, "Property details retrieved successfully.");
    }

    [HttpPost]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<PropertyDetailDto>>> CreateProperty([FromBody] CreatePropertyRequest request, CancellationToken ct)
    {
        var result = await _propertyService.CreatePropertyAsync(request, ct);
        return CreatedResponse(nameof(GetProperty), new { id = result.Id }, result, "Property created successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<PropertyDetailDto>>> UpdateProperty(Guid id, [FromBody] UpdatePropertyRequest request, CancellationToken ct)
    {
        var result = await _propertyService.UpdatePropertyAsync(id, request, ct);
        return OkResponse(result, "Property updated successfully.");
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse>> DeleteProperty(Guid id, CancellationToken ct)
    {
        await _propertyService.DeletePropertyAsync(id, ct);
        return OkMessage("Property deleted/archived successfully.");
    }
}

