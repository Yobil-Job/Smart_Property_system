namespace SmartPropertyAI.Application.Features.Visitors.DTOs;

public class VisitorSummaryDto
{
    public Guid Id { get; set; }
    public Guid ResidentId { get; set; }
    public string ResidentName { get; set; } = string.Empty;
    public string ApartmentNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    public string PropertyName { get; set; } = string.Empty;
    public string VisitorName { get; set; } = string.Empty;
    public string VisitorPhone { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public DateTime ExpectedArrival { get; set; }
    public DateTime ExpectedDeparture { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? CheckedInAt { get; set; }
    public DateTime? CheckedOutAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class VisitorDetailDto
{
    public Guid Id { get; set; }
    public Guid ResidentId { get; set; }
    public string ResidentName { get; set; } = string.Empty;
    public string? ResidentPhone { get; set; }
    public string ApartmentNumber { get; set; } = string.Empty;
    public string BuildingName { get; set; } = string.Empty;
    public string PropertyName { get; set; } = string.Empty;
    public string VisitorName { get; set; } = string.Empty;
    public string VisitorPhone { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public DateTime ExpectedArrival { get; set; }
    public DateTime ExpectedDeparture { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? CheckedInAt { get; set; }
    public DateTime? CheckedOutAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateVisitorRequest
{
    public string VisitorName { get; set; } = string.Empty;
    public string VisitorPhone { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public DateTime ExpectedArrival { get; set; }
    public DateTime ExpectedDeparture { get; set; }
    public Guid? ResidentId { get; set; }
}

public class UpdateVisitorRequest
{
    public string VisitorName { get; set; } = string.Empty;
    public string VisitorPhone { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public DateTime ExpectedArrival { get; set; }
    public DateTime ExpectedDeparture { get; set; }
}

public class VisitorFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Status { get; set; }
    public DateTime? Date { get; set; }
    public Guid? PropertyId { get; set; }
}

