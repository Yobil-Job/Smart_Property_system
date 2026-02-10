namespace SmartPropertyAI.Application.Features.Residents.DTOs;

public class ResidentSummaryDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public Guid ApartmentId { get; set; }
    public string ApartmentNumber { get; set; } = string.Empty;
    public Guid BuildingId { get; set; }
    public string BuildingName { get; set; } = string.Empty;
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateOnly MoveInDate { get; set; }
    public DateOnly? MoveOutDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ResidentDetailDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? EmergencyContact { get; set; }
    public Guid ApartmentId { get; set; }
    public string ApartmentNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public int NumberOfBedrooms { get; set; }
    public int NumberOfBathrooms { get; set; }
    public Guid BuildingId { get; set; }
    public string BuildingName { get; set; } = string.Empty;
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string PropertyAddress { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateOnly MoveInDate { get; set; }
    public DateOnly? MoveOutDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateResidentRequest
{
    public Guid UserId { get; set; }
    public Guid ApartmentId { get; set; }
    public string? EmergencyContact { get; set; }
    public DateOnly MoveInDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
}

public class UpdateResidentRequest
{
    public string? EmergencyContact { get; set; }
    public string? PhoneNumber { get; set; }
    public string? FullName { get; set; }
    public string? Status { get; set; }
    public DateOnly? MoveOutDate { get; set; }
}

public class ResidentFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public Guid? PropertyId { get; set; }
    public Guid? BuildingId { get; set; }
    public string? Status { get; set; }
    public string? SearchTerm { get; set; }
}

