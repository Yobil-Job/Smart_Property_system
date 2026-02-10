namespace SmartPropertyAI.Application.Features.Maintenance.DTOs;

public class MaintenanceRequestSummaryDto
{
    public Guid Id { get; set; }
    public string TicketNumber => $"REQ-{Id.ToString("N")[..8].ToUpperInvariant()}";
    public Guid ResidentId { get; set; }
    public string ResidentName { get; set; } = string.Empty;
    public Guid ApartmentId { get; set; }
    public string ApartmentNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    public string PropertyName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid? AssignedStaffId { get; set; }
    public string? AssignedStaffName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

public class MaintenanceRequestDetailDto
{
    public Guid Id { get; set; }
    public string TicketNumber => $"REQ-{Id.ToString("N")[..8].ToUpperInvariant()}";
    public Guid ResidentId { get; set; }
    public string ResidentName { get; set; } = string.Empty;
    public string? ResidentPhone { get; set; }
    public Guid ApartmentId { get; set; }
    public string ApartmentNumber { get; set; } = string.Empty;
    public Guid BuildingId { get; set; }
    public string BuildingName { get; set; } = string.Empty;
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid? AssignedStaffId { get; set; }
    public string? AssignedStaffName { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public List<MaintenanceNoteDto> Notes { get; set; } = new();
    public List<MaintenanceHistoryDto> History { get; set; } = new();
}

public class MaintenanceNoteDto
{
    public Guid Id { get; set; }
    public Guid MaintenanceRequestId { get; set; }
    public Guid AuthorUserId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string NoteText { get; set; } = string.Empty;
    public bool IsInternalOnly { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class MaintenanceHistoryDto
{
    public Guid Id { get; set; }
    public Guid MaintenanceRequestId { get; set; }
    public Guid ChangedByUserId { get; set; }
    public string ChangedByName { get; set; } = string.Empty;
    public string PreviousStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public string? ChangeReason { get; set; }
    public DateTime Timestamp { get; set; }
}

public class CreateMaintenanceRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "Other";
    public string Priority { get; set; } = "Medium";
    public string? ImageUrl { get; set; }
    public Guid? ResidentId { get; set; } // Admin creating on behalf of resident
}

public class UpdateMaintenanceRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public string? ImageUrl { get; set; }
}

public class UpdateMaintenanceStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? Comment { get; set; }
}

public class AssignMaintenanceRequest
{
    public Guid StaffId { get; set; }
}

public class AddMaintenanceNoteRequest
{
    public string NoteText { get; set; } = string.Empty;
    public bool IsInternalOnly { get; set; } = false;
}

public class MaintenanceFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? Category { get; set; }
    public Guid? PropertyId { get; set; }
    public Guid? AssignedStaffId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

