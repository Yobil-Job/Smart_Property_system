namespace SmartPropertyAI.Application.Features.Amenities.DTOs;

public class AmenityDto
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string OpenTime { get; set; } = string.Empty;
    public string CloseTime { get; set; } = string.Empty;
    public string RulesSummary { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class AmenitySlotDto
{
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public bool IsBooked { get; set; }
    public string? BookedBy { get; set; }
}

public class AmenityAvailabilityDto
{
    public Guid AmenityId { get; set; }
    public string AmenityName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public List<AmenitySlotDto> Slots { get; set; } = new();
}

public class BookAmenityRequestDto
{
    public DateTime BookingDate { get; set; }
    public string StartTime { get; set; } = string.Empty; // e.g. "14:00"
    public string EndTime { get; set; } = string.Empty;   // e.g. "16:00"
    public int GuestCount { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class AmenityBookingDto
{
    public Guid Id { get; set; }
    public Guid AmenityId { get; set; }
    public string AmenityName { get; set; } = string.Empty;
    public string AmenityImageUrl { get; set; } = string.Empty;
    public Guid ResidentId { get; set; }
    public string ResidentName { get; set; } = string.Empty;
    public string ApartmentNumber { get; set; } = string.Empty;
    public DateTime BookingDate { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public int GuestCount { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

