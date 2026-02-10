namespace SmartPropertyAI.Application.Features.Buildings.DTOs;

public class BuildingSummaryDto
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int FloorCount { get; set; }
    public string? Description { get; set; }
    public int ApartmentCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BuildingDetailDto
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public string PropertyName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int FloorCount { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<ApartmentDtoInBuilding> Apartments { get; set; } = new();
}

public class ApartmentDtoInBuilding
{
    public Guid Id { get; set; }
    public string ApartmentNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public int NumberOfBedrooms { get; set; }
    public int NumberOfBathrooms { get; set; }
    public string OccupancyStatus { get; set; } = string.Empty;
}

public class CreateBuildingRequest
{
    public string Name { get; set; } = string.Empty;
    public int FloorCount { get; set; }
    public string? Description { get; set; }
}

public class UpdateBuildingRequest
{
    public string Name { get; set; } = string.Empty;
    public int FloorCount { get; set; }
    public string? Description { get; set; }
}

