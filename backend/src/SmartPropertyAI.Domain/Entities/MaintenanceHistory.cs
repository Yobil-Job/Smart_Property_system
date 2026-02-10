using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class MaintenanceHistory : BaseEntity<Guid>
{
    public Guid MaintenanceRequestId { get; set; }
    public Guid ChangedByUserId { get; set; }
    public string ChangedByName { get; set; } = string.Empty;
    public MaintenanceStatus PreviousStatus { get; set; }
    public MaintenanceStatus NewStatus { get; set; }
    public string? ChangeReason { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public MaintenanceRequest MaintenanceRequest { get; set; } = null!;

    public MaintenanceHistory()
    {
        Id = Guid.NewGuid();
    }
}

