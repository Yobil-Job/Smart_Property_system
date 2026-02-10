using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class Staff : BaseAuditableEntity
{
    public Guid UserId { get; set; }
    public Guid PropertyId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public EmploymentStatus EmploymentStatus { get; set; } = EmploymentStatus.Active;

    public Property Property { get; set; } = null!;
}

