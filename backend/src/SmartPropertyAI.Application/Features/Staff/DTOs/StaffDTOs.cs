namespace SmartPropertyAI.Application.Features.Staff.DTOs;

public class StaffSummaryDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string EmploymentStatus { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class StaffDetailDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string PropertyAddress { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string EmploymentStatus { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateStaffRequest
{
    public Guid UserId { get; set; }
    public Guid PropertyId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
}

public class UpdateStaffRequest
{
    public string? Position { get; set; }
    public Guid? PropertyId { get; set; }
    public string? EmploymentStatus { get; set; }
}

public class StaffFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public Guid? PropertyId { get; set; }
    public string? Position { get; set; }
    public string? EmploymentStatus { get; set; }
    public string? SearchTerm { get; set; }
}

public class StaffTaskOverviewDto
{
    public StaffDetailDto StaffMember { get; set; } = null!;
    public int ActiveTasksCount { get; set; } = 0;
    public List<string> PendingTasks { get; set; } = new();
}

