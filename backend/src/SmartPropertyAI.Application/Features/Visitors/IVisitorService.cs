using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Visitors.DTOs;

namespace SmartPropertyAI.Application.Features.Visitors;

public interface IVisitorService
{
    Task<VisitorDetailDto> CreateVisitorAsync(CreateVisitorRequest request, CancellationToken ct = default);
    Task<PagedResult<VisitorSummaryDto>> GetVisitorsAsync(VisitorFilterDto filter, CancellationToken ct = default);
    Task<VisitorDetailDto> GetVisitorByIdAsync(Guid id, CancellationToken ct = default);
    Task<VisitorDetailDto> UpdateVisitorAsync(Guid id, UpdateVisitorRequest request, CancellationToken ct = default);
    Task<VisitorDetailDto> ApproveVisitorAsync(Guid id, CancellationToken ct = default);
    Task<VisitorDetailDto> RejectVisitorAsync(Guid id, CancellationToken ct = default);
    Task<VisitorDetailDto> CheckInVisitorAsync(Guid id, CancellationToken ct = default);
    Task<VisitorDetailDto> CheckOutVisitorAsync(Guid id, CancellationToken ct = default);
    Task<PagedResult<VisitorSummaryDto>> GetMyVisitorsAsync(int pageNumber, int pageSize, CancellationToken ct = default);
}

