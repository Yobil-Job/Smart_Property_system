using SmartPropertyAI.Domain.Common;

namespace SmartPropertyAI.Domain.Entities;

public class Building : BaseAuditableEntity
{
    public Guid PropertyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int FloorCount { get; set; }
    public string? Description { get; set; }

    public Property Property { get; set; } = null!;
    public ICollection<Apartment> Apartments { get; set; } = new List<Apartment>();
}

