using SmartPropertyAI.Domain.Common;

namespace SmartPropertyAI.Domain.Entities;

public class AuditLog : BaseEntity<Guid>
{
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? PreviousValues { get; set; }
    public string? NewValues { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public AuditLog()
    {
        Id = Guid.NewGuid();
    }
}

