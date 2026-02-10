using SmartPropertyAI.Application.Features.Dashboard.DTOs;

namespace SmartPropertyAI.Application.Features.Dashboard;

public interface IDashboardService
{
    Task<AdminDashboardDto> GetAdminDashboardAsync(Guid? propertyId, CancellationToken ct = default);
    Task<StaffDashboardDto> GetStaffDashboardAsync(Guid staffUserId, CancellationToken ct = default);
    Task<ResidentDashboardDto> GetResidentDashboardAsync(Guid residentUserId, CancellationToken ct = default);
}

