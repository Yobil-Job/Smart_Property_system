using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class Apartment : BaseAuditableEntity
{
    public Guid BuildingId { get; set; }
    public string ApartmentNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public int NumberOfBedrooms { get; set; }
    public int NumberOfBathrooms { get; set; }
    public OccupancyStatus OccupancyStatus { get; set; } = OccupancyStatus.Vacant;

    public Building Building { get; set; } = null!;
    public ICollection<Resident> Residents { get; set; } = new List<Resident>();
}

