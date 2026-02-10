using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class AmenityBooking : BaseAuditableEntity, ISoftDeletable
{
    public Guid AmenityId { get; set; }
    public Guid ResidentId { get; set; }
    public DateTime BookingDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int GuestCount { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public AmenityBookingStatus Status { get; set; } = AmenityBookingStatus.Confirmed;

    public Amenity Amenity { get; set; } = null!;
    public Resident Resident { get; set; } = null!;
}
