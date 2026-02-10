namespace SmartPropertyAI.Application.Features.Analytics.DTOs;

public class AnalyticsDateFilterDto
{
    public Guid? PropertyId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class MaintenanceAnalyticsDto
{
    public int TotalRequests { get; set; }
    public double AverageResolutionHours { get; set; }
    public Dictionary<string, int> ByCategory { get; set; } = new();
    public Dictionary<string, int> ByPriority { get; set; } = new();
    public double ResolutionRatePercentage { get; set; }
}

public class VisitorAnalyticsDto
{
    public int TotalVisitors { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public string PeakHour { get; set; } = "14:00 - 16:00";
    public double AverageDurationMinutes { get; set; }
}

public class OccupancyAnalyticsDto
{
    public int TotalUnits { get; set; }
    public int OccupiedUnits { get; set; }
    public int VacantUnits { get; set; }
    public int UnderMaintenanceUnits { get; set; }
    public double OccupancyPercentage { get; set; }
}

