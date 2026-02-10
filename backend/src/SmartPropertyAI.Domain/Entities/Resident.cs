using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class Resident : BaseAuditableEntity
{
    public Guid UserId { get; set; }
    public Guid ApartmentId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? EmergencyContact { get; set; }
    public DateOnly MoveInDate { get; set; }
    public DateOnly? MoveOutDate { get; set; }
    public ResidentStatus Status { get; set; } = ResidentStatus.Active;

    public Apartment Apartment { get; set; } = null!;
}

