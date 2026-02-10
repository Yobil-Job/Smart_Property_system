using SmartPropertyAI.Application.Features.Amenities.DTOs;

namespace SmartPropertyAI.Application.Features.Amenities;

public interface IAmenityService
{
    Task<List<AmenityDto>> GetAmenitiesAsync(Guid? propertyId = null, CancellationToken ct = default);
    Task<AmenityDto> GetAmenityByIdAsync(Guid id, CancellationToken ct = default);
    Task<AmenityAvailabilityDto> GetAvailabilityAsync(Guid amenityId, DateTime date, CancellationToken ct = default);
    Task<AmenityBookingDto> BookAmenityAsync(Guid amenityId, Guid userId, BookAmenityRequestDto request, CancellationToken ct = default);
    Task<List<AmenityBookingDto>> GetMyBookingsAsync(Guid userId, CancellationToken ct = default);
    Task<bool> CancelBookingAsync(Guid bookingId, Guid userId, CancellationToken ct = default);
}

