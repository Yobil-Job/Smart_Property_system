using SmartPropertyAI.Application.Features.Buildings.DTOs;

namespace SmartPropertyAI.Application.Features.Buildings;

public interface IBuildingService
{
    Task<List<BuildingSummaryDto>> GetBuildingsByPropertyIdAsync(Guid propertyId, CancellationToken ct = default);
    Task<BuildingDetailDto> GetBuildingByIdAsync(Guid id, CancellationToken ct = default);
    Task<BuildingDetailDto> CreateBuildingAsync(Guid propertyId, CreateBuildingRequest request, CancellationToken ct = default);
    Task<BuildingDetailDto> UpdateBuildingAsync(Guid id, UpdateBuildingRequest request, CancellationToken ct = default);
    Task DeleteBuildingAsync(Guid id, CancellationToken ct = default);
}

