using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartPropertyAI.Application.Features.Dashboard;
using SmartPropertyAI.Application.Features.Dashboard.DTOs;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(ApplicationDbContext context, ILogger<DashboardService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<AdminDashboardDto> GetAdminDashboardAsync(Guid? propertyId, CancellationToken ct = default)
    {
        _logger.LogInformation("Retrieving admin dashboard (PropertyId: {PropertyId})", propertyId);

        var propertiesQuery = _context.Properties.AsNoTracking();
        var buildingsQuery = _context.Buildings.AsNoTracking();
        var apartmentsQuery = _context.Apartments.Include(a => a.Building).AsNoTracking();
        var maintenanceQuery = _context.MaintenanceRequests.Include(m => m.Apartment).ThenInclude(a => a.Building).AsNoTracking();
        var visitorsQuery = _context.Visitors.Include(v => v.Resident).ThenInclude(r => r.Apartment).ThenInclude(a => a.Building).AsNoTracking();
        var staffQuery = _context.StaffMembers.AsNoTracking();

        if (propertyId.HasValue)
        {
            var pid = propertyId.Value;
            propertiesQuery = propertiesQuery.Where(p => p.Id == pid);
            buildingsQuery = buildingsQuery.Where(b => b.PropertyId == pid);
            apartmentsQuery = apartmentsQuery.Where(a => a.Building.PropertyId == pid);
            maintenanceQuery = maintenanceQuery.Where(m => m.Apartment.Building.PropertyId == pid);
            visitorsQuery = visitorsQuery.Where(v => v.Resident.Apartment.Building.PropertyId == pid);
            staffQuery = staffQuery.Where(s => s.PropertyId == pid);
        }

        var totalProperties = await propertiesQuery.CountAsync(ct);
        var totalBuildings = await buildingsQuery.CountAsync(ct);
        var totalApartments = await apartmentsQuery.CountAsync(ct);
        var occupiedCount = await apartmentsQuery.CountAsync(a => a.OccupancyStatus == OccupancyStatus.Occupied, ct);
        var occupancyRate = totalApartments > 0 ? Math.Round((double)occupiedCount / totalApartments * 100.0, 2) : 0.0;

        var pendingTriage = await maintenanceQuery.CountAsync(m => m.Status == MaintenanceStatus.Pending, ct);
        var assignedInProgress = await maintenanceQuery.CountAsync(
            m => m.Status == MaintenanceStatus.Assigned || m.Status == MaintenanceStatus.InProgress, ct);
        var urgentUnassigned = await maintenanceQuery.CountAsync(
            m => m.Priority == MaintenancePriority.Urgent && m.AssignedStaffId == null &&
                 m.Status != MaintenanceStatus.Resolved && m.Status != MaintenanceStatus.Closed, ct);

        var activeVisitors = await visitorsQuery.CountAsync(v => v.Status == VisitorStatus.CheckedIn, ct);
        var staffOnDuty = await staffQuery.CountAsync(s => s.EmploymentStatus == EmploymentStatus.Active, ct);

        return new AdminDashboardDto
        {
            TotalProperties = totalProperties,
            TotalBuildings = totalBuildings,
            TotalApartments = totalApartments,
            OverallOccupancyRate = occupancyRate,
            MaintenanceSummary = new AdminMaintenanceSummaryDto
            {
                PendingTriage = pendingTriage,
                AssignedInProgress = assignedInProgress,
                UrgentUnassigned = urgentUnassigned
            },
            ActiveVisitorsOnSite = activeVisitors,
            StaffOnDutyCount = staffOnDuty
        };
    }

    public async Task<StaffDashboardDto> GetStaffDashboardAsync(Guid staffUserId, CancellationToken ct = default)
    {
        _logger.LogInformation("Retrieving staff dashboard for User: {UserId}", staffUserId);

        var staff = await _context.StaffMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == staffUserId, ct);

        if (staff == null)
        {
            return new StaffDashboardDto();
        }

        var tasks = await _context.MaintenanceRequests
            .Include(m => m.Apartment)
            .ThenInclude(a => a.Building)
            .Where(m => m.AssignedStaffId == staff.Id &&
                        m.Status != MaintenanceStatus.Resolved &&
                        m.Status != MaintenanceStatus.Closed &&
                        m.Status != MaintenanceStatus.Rejected)
            .OrderByDescending(m => m.Priority)
            .ThenByDescending(m => m.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);

        var todayUtc = DateTime.UtcNow.Date;
        var tomorrowUtc = todayUtc.AddDays(1);

        var todaysVisitors = await _context.Visitors
            .Include(v => v.Resident)
            .ThenInclude(r => r.Apartment)
            .ThenInclude(a => a.Building)
            .Where(v => v.Resident.Apartment.Building.PropertyId == staff.PropertyId &&
                        v.ExpectedArrival >= todayUtc && v.ExpectedArrival < tomorrowUtc &&
                        (v.Status == VisitorStatus.Approved || v.Status == VisitorStatus.Pending || v.Status == VisitorStatus.CheckedIn))
            .CountAsync(ct);

        return new StaffDashboardDto
        {
            AssignedTasksCount = tasks.Count,
            UrgentTasksCount = tasks.Count(t => t.Priority == MaintenancePriority.Urgent),
            TodaysExpectedVisitorsCount = todaysVisitors,
            Tasks = tasks.Select(t => new StaffTaskSummaryDto
            {
                Id = t.Id,
                TicketNumber = $"REQ-{t.Id.ToString("N")[..6].ToUpperInvariant()}",
                Title = t.Title,
                ApartmentNumber = t.Apartment?.ApartmentNumber ?? string.Empty,
                BuildingName = t.Apartment?.Building?.Name ?? string.Empty,
                Priority = t.Priority.ToString(),
                Status = t.Status.ToString()
            }).ToList()
        };
    }

    public async Task<ResidentDashboardDto> GetResidentDashboardAsync(Guid residentUserId, CancellationToken ct = default)
    {
        _logger.LogInformation("Retrieving resident dashboard for User: {UserId}", residentUserId);

        var resident = await _context.Residents
            .Include(r => r.Apartment)
            .ThenInclude(a => a.Building)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == residentUserId, ct);

        if (resident == null)
        {
            return new ResidentDashboardDto();
        }

        var activeRequests = await _context.MaintenanceRequests
            .Include(m => m.AssignedStaff)
            .Where(m => m.ResidentId == resident.Id &&
                        m.Status != MaintenanceStatus.Resolved &&
                        m.Status != MaintenanceStatus.Closed &&
                        m.Status != MaintenanceStatus.Rejected)
            .OrderByDescending(m => m.UpdatedAt ?? m.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);

        var upcomingVisitors = await _context.Visitors
            .Where(v => v.ResidentId == resident.Id &&
                        v.ExpectedArrival >= DateTime.UtcNow.AddHours(-1) &&
                        (v.Status == VisitorStatus.Pending || v.Status == VisitorStatus.Approved || v.Status == VisitorStatus.CheckedIn))
            .OrderBy(v => v.ExpectedArrival)
            .AsNoTracking()
            .ToListAsync(ct);

        var unreadNotifications = await _context.Notifications
            .CountAsync(n => n.UserId == residentUserId && !n.IsRead, ct);

        return new ResidentDashboardDto
        {
            ResidentName = resident.FullName,
            ApartmentNumber = resident.Apartment?.ApartmentNumber ?? string.Empty,
            BuildingName = resident.Apartment?.Building?.Name ?? string.Empty,
            UnreadNotificationCount = unreadNotifications,
            ActiveMaintenanceRequests = activeRequests.Select(r => new ResidentMaintenanceSummaryDto
            {
                Id = r.Id,
                Title = r.Title,
                Status = r.Status.ToString(),
                AssignedStaffName = r.AssignedStaff?.Position,
                UpdatedAt = r.UpdatedAt ?? r.CreatedAt
            }).ToList(),
            UpcomingVisitors = upcomingVisitors.Select(v => new UpcomingVisitorDto
            {
                Id = v.Id,
                VisitorName = v.VisitorName,
                ExpectedArrival = v.ExpectedArrival,
                Status = v.Status.ToString()
            }).ToList()
        };
    }
}

