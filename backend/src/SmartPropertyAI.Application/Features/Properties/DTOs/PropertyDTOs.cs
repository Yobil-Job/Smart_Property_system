namespace SmartPropertyAI.Application.Features.Properties.DTOs;

public class PropertySummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string PropertyType { get; set; } = string.Empty;
    public int BuildingCount { get; set; }
    public int TotalApartmentCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PropertyDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string PropertyType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<BuildingDtoInProperty> Buildings { get; set; } = new();
    public List<StaffDtoInProperty> StaffMembers { get; set; } = new();
}

public class BuildingDtoInProperty
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int FloorCount { get; set; }
    public string? Description { get; set; }
    public int ApartmentCount { get; set; }
}

public class StaffDtoInProperty
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string EmploymentStatus { get; set; } = string.Empty;
}

public class CreatePropertyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string PropertyType { get; set; } = "Residential";
}

public class UpdatePropertyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string PropertyType { get; set; } = "Residential";
}

public class PropertyFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? City { get; set; }
    public string? PropertyType { get; set; }
    public string? SearchTerm { get; set; }
}

