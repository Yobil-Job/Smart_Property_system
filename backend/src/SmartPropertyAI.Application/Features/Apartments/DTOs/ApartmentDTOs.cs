namespace SmartPropertyAI.Application.Features.Apartments.DTOs;

public class ApartmentSummaryDto
{
    public Guid Id { get; set; }
    public Guid BuildingId { get; set; }
    public string BuildingName { get; set; } = string.Empty;
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string ApartmentNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public int NumberOfBedrooms { get; set; }
    public int NumberOfBathrooms { get; set; }
    public string OccupancyStatus { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ApartmentDetailDto
{
    public Guid Id { get; set; }
    public Guid BuildingId { get; set; }
    public string BuildingName { get; set; } = string.Empty;
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string ApartmentNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public int NumberOfBedrooms { get; set; }
    public int NumberOfBathrooms { get; set; }
    public string OccupancyStatus { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<ResidentDtoInApartment> Residents { get; set; } = new();
}

public class ResidentDtoInApartment
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateOnly MoveInDate { get; set; }
    public DateOnly? MoveOutDate { get; set; }
}

public class CreateApartmentRequest
{
    public string ApartmentNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public int NumberOfBedrooms { get; set; }
    public int NumberOfBathrooms { get; set; }
}

public class UpdateApartmentRequest
{
    public string ApartmentNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public int NumberOfBedrooms { get; set; }
    public int NumberOfBathrooms { get; set; }
}

public class UpdateOccupancyRequest
{
    public string OccupancyStatus { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

public class ApartmentFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? OccupancyStatus { get; set; }
    public int? Floor { get; set; }
}

