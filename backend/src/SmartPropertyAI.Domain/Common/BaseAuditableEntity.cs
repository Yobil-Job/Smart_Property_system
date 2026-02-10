namespace SmartPropertyAI.Domain.Common;

public abstract class BaseAuditableEntity<TId> : BaseEntity<TId>, ISoftDeletable
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}

public abstract class BaseAuditableEntity : BaseAuditableEntity<Guid>
{
    protected BaseAuditableEntity()
    {
        Id = Guid.NewGuid();
    }
}

