using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Staff.DTOs;

namespace SmartPropertyAI.Application.Features.Staff;

public interface IStaffService
{
    Task<PagedResult<StaffSummaryDto>> GetStaffMembersAsync(StaffFilterDto filter, CancellationToken ct = default);
    Task<StaffDetailDto> GetStaffByIdAsync(Guid id, CancellationToken ct = default);
    Task<StaffDetailDto> GetStaffByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<StaffDetailDto> CreateStaffAsync(CreateStaffRequest request, CancellationToken ct = default);
    Task<StaffDetailDto> UpdateStaffAsync(Guid id, UpdateStaffRequest request, CancellationToken ct = default);
    Task<StaffTaskOverviewDto> GetMyTasksAsync(Guid userId, CancellationToken ct = default);
}

