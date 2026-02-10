using SmartPropertyAI.Domain.Common;

namespace SmartPropertyAI.Domain.Entities;

public class MaintenanceNote : BaseAuditableEntity
{
    public Guid MaintenanceRequestId { get; set; }
    public Guid AuthorUserId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string NoteText { get; set; } = string.Empty;
    public bool IsInternalOnly { get; set; } = false;

    public MaintenanceRequest MaintenanceRequest { get; set; } = null!;
}

