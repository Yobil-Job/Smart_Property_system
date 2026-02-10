using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Apartments.DTOs;
using SmartPropertyAI.Application.Features.Residents.DTOs;

namespace SmartPropertyAI.Application.Features.Residents;

public interface IResidentService
{
    Task<PagedResult<ResidentSummaryDto>> GetResidentsAsync(ResidentFilterDto filter, CancellationToken ct = default);
    Task<ResidentDetailDto> GetResidentByIdAsync(Guid id, CancellationToken ct = default);
    Task<ResidentDetailDto> GetResidentByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<ResidentDetailDto> CreateResidentAsync(CreateResidentRequest request, CancellationToken ct = default);
    Task<ResidentDetailDto> UpdateResidentAsync(Guid id, UpdateResidentRequest request, CancellationToken ct = default);
    Task<ApartmentDetailDto> GetApartmentForResidentAsync(Guid residentId, CancellationToken ct = default);
}

