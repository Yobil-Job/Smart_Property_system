namespace SmartPropertyAI.Application.Features.Dashboard.DTOs;

public class AdminDashboardDto
{
    public int TotalProperties { get; set; }
    public int TotalBuildings { get; set; }
    public int TotalApartments { get; set; }
    public double OverallOccupancyRate { get; set; }
    public AdminMaintenanceSummaryDto MaintenanceSummary { get; set; } = new();
    public int ActiveVisitorsOnSite { get; set; }
    public int StaffOnDutyCount { get; set; }
}

public class AdminMaintenanceSummaryDto
{
    public int PendingTriage { get; set; }
    public int AssignedInProgress { get; set; }
    public int UrgentUnassigned { get; set; }
}

public class StaffDashboardDto
{
    public int AssignedTasksCount { get; set; }
    public int UrgentTasksCount { get; set; }
    public List<StaffTaskSummaryDto> Tasks { get; set; } = new();
    public int TodaysExpectedVisitorsCount { get; set; }
}

public class StaffTaskSummaryDto
{
    public Guid Id { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ApartmentNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class ResidentDashboardDto
{
    public string ResidentName { get; set; } = string.Empty;
    public string ApartmentNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    public List<ResidentMaintenanceSummaryDto> ActiveMaintenanceRequests { get; set; } = new();
    public List<UpcomingVisitorDto> UpcomingVisitors { get; set; } = new();
    public int UnreadNotificationCount { get; set; }
}

public class ResidentMaintenanceSummaryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AssignedStaffName { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpcomingVisitorDto
{
    public Guid Id { get; set; }
    public string VisitorName { get; set; } = string.Empty;
    public DateTime ExpectedArrival { get; set; }
    public string Status { get; set; } = string.Empty;
}

