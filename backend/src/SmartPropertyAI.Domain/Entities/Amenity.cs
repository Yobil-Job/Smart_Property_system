using SmartPropertyAI.Domain.Common;

namespace SmartPropertyAI.Domain.Entities;

public class Amenity : BaseAuditableEntity, ISoftDeletable
{
    public Guid PropertyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public TimeSpan OpenTime { get; set; } = new TimeSpan(8, 0, 0);
    public TimeSpan CloseTime { get; set; } = new TimeSpan(22, 0, 0);
    public string RulesSummary { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public Property Property { get; set; } = null!;
    public ICollection<AmenityBooking> Bookings { get; set; } = new List<AmenityBooking>();
}
