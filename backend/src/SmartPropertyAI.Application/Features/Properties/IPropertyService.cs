using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Properties.DTOs;

namespace SmartPropertyAI.Application.Features.Properties;

public interface IPropertyService
{
    Task<PagedResult<PropertySummaryDto>> GetPropertiesAsync(PropertyFilterDto filter, CancellationToken ct = default);
    Task<PropertyDetailDto> GetPropertyByIdAsync(Guid id, CancellationToken ct = default);
    Task<PropertyDetailDto> CreatePropertyAsync(CreatePropertyRequest request, CancellationToken ct = default);
    Task<PropertyDetailDto> UpdatePropertyAsync(Guid id, UpdatePropertyRequest request, CancellationToken ct = default);
    Task DeletePropertyAsync(Guid id, CancellationToken ct = default);
}

