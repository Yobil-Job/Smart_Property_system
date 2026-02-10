using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class MaintenanceRequest : BaseAuditableEntity
{
    public Guid ResidentId { get; set; }
    public Guid ApartmentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public MaintenanceCategory Category { get; set; } = MaintenanceCategory.Other;
    public MaintenancePriority Priority { get; set; } = MaintenancePriority.Medium;
    public MaintenanceStatus Status { get; set; } = MaintenanceStatus.Pending;
    public Guid? AssignedStaffId { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ImageUrl { get; set; }

    public Resident Resident { get; set; } = null!;
    public Apartment Apartment { get; set; } = null!;
    public Staff? AssignedStaff { get; set; }
    public ICollection<MaintenanceNote> Notes { get; set; } = new List<MaintenanceNote>();
    public ICollection<MaintenanceHistory> History { get; set; } = new List<MaintenanceHistory>();
}

