using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Amenities;
using SmartPropertyAI.Application.Features.Amenities.DTOs;
using SmartPropertyAI.Application.Interfaces;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
[Route("api/v1/amenities")]
public class AmenitiesController : BaseApiController
{
    private readonly IAmenityService _amenityService;
    private readonly ICurrentUserService _currentUserService;

    public AmenitiesController(
        IAmenityService amenityService,
        ICurrentUserService currentUserService)
    {
        _amenityService = amenityService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<List<AmenityDto>>>> GetAmenities(
        [FromQuery] Guid? propertyId,
        CancellationToken ct)
    {
        var result = await _amenityService.GetAmenitiesAsync(propertyId, ct);
        return OkResponse(result, "Amenities retrieved successfully.");
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AmenityDto>>> GetAmenity(
        Guid id,
        CancellationToken ct)
    {
        var result = await _amenityService.GetAmenityByIdAsync(id, ct);
        return OkResponse(result, "Amenity details retrieved.");
    }

    [HttpGet("{id}/availability")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AmenityAvailabilityDto>>> GetAvailability(
        Guid id,
        [FromQuery] DateTime? date,
        CancellationToken ct)
    {
        var targetDate = date ?? DateTime.UtcNow.Date;
        var result = await _amenityService.GetAvailabilityAsync(id, targetDate, ct);
        return OkResponse(result, "Amenity availability retrieved.");
    }

    [HttpPost("{id}/book")]
    public async Task<ActionResult<ApiResponse<AmenityBookingDto>>> BookAmenity(
        Guid id,
        [FromBody] BookAmenityRequestDto request,
        CancellationToken ct)
    {
        var userId = _currentUserService.UserId ?? Guid.Empty;
        var result = await _amenityService.BookAmenityAsync(id, userId, request, ct);
        return CreatedResponse(nameof(GetAmenity), new { id = result.Id }, result, "Amenity reservation confirmed successfully.");
    }

    [HttpGet("my-bookings")]
    public async Task<ActionResult<ApiResponse<List<AmenityBookingDto>>>> GetMyBookings(CancellationToken ct)
    {
        var userId = _currentUserService.UserId ?? Guid.Empty;
        var result = await _amenityService.GetMyBookingsAsync(userId, ct);
        return OkResponse(result, "Personal amenity reservations retrieved.");
    }

    [HttpDelete("bookings/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> CancelBooking(Guid id, CancellationToken ct)
    {
        var userId = _currentUserService.UserId ?? Guid.Empty;
        var result = await _amenityService.CancelBookingAsync(id, userId, ct);
        return OkResponse(result, "Reservation cancelled successfully.");
    }
}

