using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class Property : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public PropertyType PropertyType { get; set; } = PropertyType.Residential;

    public ICollection<Building> Buildings { get; set; } = new List<Building>();
    public ICollection<Staff> StaffMembers { get; set; } = new List<Staff>();
}

