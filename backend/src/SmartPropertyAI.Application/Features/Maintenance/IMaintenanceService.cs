using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Maintenance.DTOs;

namespace SmartPropertyAI.Application.Features.Maintenance;

public interface IMaintenanceService
{
    Task<MaintenanceRequestDetailDto> CreateRequestAsync(CreateMaintenanceRequest request, CancellationToken ct = default);
    Task<PagedResult<MaintenanceRequestSummaryDto>> GetRequestsAsync(MaintenanceFilterDto filter, CancellationToken ct = default);
    Task<MaintenanceRequestDetailDto> GetRequestByIdAsync(Guid id, CancellationToken ct = default);
    Task<MaintenanceRequestDetailDto> UpdateRequestAsync(Guid id, UpdateMaintenanceRequest request, CancellationToken ct = default);
    Task<MaintenanceRequestDetailDto> UpdateStatusAsync(Guid id, UpdateMaintenanceStatusRequest request, CancellationToken ct = default);
    Task<MaintenanceRequestDetailDto> AssignStaffAsync(Guid id, AssignMaintenanceRequest request, CancellationToken ct = default);
    Task<MaintenanceNoteDto> AddNoteAsync(Guid id, AddMaintenanceNoteRequest request, CancellationToken ct = default);
    Task<List<MaintenanceHistoryDto>> GetHistoryAsync(Guid id, CancellationToken ct = default);
    Task<PagedResult<MaintenanceRequestSummaryDto>> GetMyRequestsAsync(int pageNumber, int pageSize, string? status, CancellationToken ct = default);
    Task<PagedResult<MaintenanceRequestSummaryDto>> GetAssignedToMeAsync(int pageNumber, int pageSize, string? status, string? priority, CancellationToken ct = default);
}

