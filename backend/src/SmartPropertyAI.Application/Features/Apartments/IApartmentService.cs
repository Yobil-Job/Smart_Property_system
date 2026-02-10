using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Apartments.DTOs;

namespace SmartPropertyAI.Application.Features.Apartments;

public interface IApartmentService
{
    Task<PagedResult<ApartmentSummaryDto>> GetApartmentsByBuildingIdAsync(Guid buildingId, ApartmentFilterDto filter, CancellationToken ct = default);
    Task<ApartmentDetailDto> GetApartmentByIdAsync(Guid id, CancellationToken ct = default);
    Task<ApartmentDetailDto> CreateApartmentAsync(Guid buildingId, CreateApartmentRequest request, CancellationToken ct = default);
    Task<ApartmentDetailDto> UpdateApartmentAsync(Guid id, UpdateApartmentRequest request, CancellationToken ct = default);
    Task<ApartmentDetailDto> UpdateOccupancyStatusAsync(Guid id, UpdateOccupancyRequest request, CancellationToken ct = default);
}

