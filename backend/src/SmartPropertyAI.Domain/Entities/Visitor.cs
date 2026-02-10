using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class Visitor : BaseAuditableEntity
{
    public Guid ResidentId { get; set; }
    public string VisitorName { get; set; } = string.Empty;
    public string VisitorPhone { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public DateTime ExpectedArrival { get; set; }
    public DateTime ExpectedDeparture { get; set; }
    public VisitorStatus Status { get; set; } = VisitorStatus.Pending;
    public Guid? ApprovedBy { get; set; }
    public DateTime? CheckedInAt { get; set; }
    public DateTime? CheckedOutAt { get; set; }

    public Resident Resident { get; set; } = null!;
}

