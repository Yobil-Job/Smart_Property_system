using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Properties;
using SmartPropertyAI.Application.Features.Properties.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class PropertyService : IPropertyService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public PropertyService(ApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<PagedResult<PropertySummaryDto>> GetPropertiesAsync(PropertyFilterDto filter, CancellationToken ct = default)
    {
        var query = _context.Properties
            .Include(p => p.Buildings)
                .ThenInclude(b => b.Apartments)
            .AsNoTracking()
            .AsQueryable();

        // If current user is a Resident, they can only see the property they reside in
        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var residentApartment = await _context.Residents
                .Where(r => r.UserId == userId && r.Status == ResidentStatus.Active)
                .Select(r => r.Apartment)
                .FirstOrDefaultAsync(ct);

            if (residentApartment == null)
            {
                return new PagedResult<PropertySummaryDto>(new List<PropertySummaryDto>(), 0, filter.PageNumber, filter.PageSize);
            }

            var residentBuilding = await _context.Buildings
                .FirstOrDefaultAsync(b => b.Id == residentApartment.BuildingId, ct);

            if (residentBuilding == null)
            {
                return new PagedResult<PropertySummaryDto>(new List<PropertySummaryDto>(), 0, filter.PageNumber, filter.PageSize);
            }

            query = query.Where(p => p.Id == residentBuilding.PropertyId);
        }

        if (!string.IsNullOrWhiteSpace(filter.City))
        {
            var city = filter.City.Trim().ToLower();
            query = query.Where(p => p.City.ToLower().Contains(city));
        }

        if (!string.IsNullOrWhiteSpace(filter.PropertyType) && Enum.TryParse<PropertyType>(filter.PropertyType, true, out var pType))
        {
            query = query.Where(p => p.PropertyType == pType);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var search = filter.SearchTerm.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(search) || p.Address.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(p => new PropertySummaryDto
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                Address = p.Address,
                City = p.City,
                Country = p.Country,
                PropertyType = p.PropertyType.ToString(),
                BuildingCount = p.Buildings.Count,
                TotalApartmentCount = p.Buildings.SelectMany(b => b.Apartments).Count(),
                CreatedAt = p.CreatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<PropertySummaryDto>(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<PropertyDetailDto> GetPropertyByIdAsync(Guid id, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .Include(p => p.Buildings)
                .ThenInclude(b => b.Apartments)
            .Include(p => p.StaffMembers)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (property == null)
        {
            throw new NotFoundException("Property", id);
        }

        // Authorization checks
        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isResidentInProperty = await _context.Residents
                .AnyAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active &&
                               r.Apartment.Building.PropertyId == id, ct);

            if (!isResidentInProperty)
            {
                throw new ForbiddenException("You do not have access to this property.");
            }
        }
        else if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isStaffAssigned = await _context.StaffMembers
                .AnyAsync(s => s.UserId == userId && s.PropertyId == id && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (!isStaffAssigned)
            {
                throw new ForbiddenException("You are not assigned to this property.");
            }
        }

        // Fetch staff user details
        var staffUserIds = property.StaffMembers.Select(s => s.UserId).ToList();
        var staffUsers = await _context.Users
            .Where(u => staffUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => new { u.FullName, u.Email }, ct);

        return new PropertyDetailDto
        {
            Id = property.Id,
            Name = property.Name,
            Description = property.Description,
            Address = property.Address,
            City = property.City,
            Country = property.Country,
            PropertyType = property.PropertyType.ToString(),
            CreatedAt = property.CreatedAt,
            UpdatedAt = property.UpdatedAt,
            Buildings = property.Buildings.Select(b => new BuildingDtoInProperty
            {
                Id = b.Id,
                Name = b.Name,
                FloorCount = b.FloorCount,
                Description = b.Description,
                ApartmentCount = b.Apartments.Count
            }).ToList(),
            StaffMembers = property.StaffMembers.Select(s => new StaffDtoInProperty
            {
                Id = s.Id,
                UserId = s.UserId,
                FullName = staffUsers.TryGetValue(s.UserId, out var su) ? su.FullName : string.Empty,
                Email = staffUsers.TryGetValue(s.UserId, out var su2) ? su2.Email! : string.Empty,
                EmployeeNumber = s.EmployeeNumber,
                Position = s.Position,
                EmploymentStatus = s.EmploymentStatus.ToString()
            }).ToList()
        };
    }

    public async Task<PropertyDetailDto> CreatePropertyAsync(CreatePropertyRequest request, CancellationToken ct = default)
    {
        if (!Enum.TryParse<PropertyType>(request.PropertyType, true, out var pType))
        {
            throw new ValidationException("PropertyType", "Invalid property type specified.");
        }

        var property = new Property
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Address = request.Address.Trim(),
            City = request.City.Trim(),
            Country = request.Country.Trim(),
            PropertyType = pType
        };

        _context.Properties.Add(property);
        await _context.SaveChangesAsync(ct);

        return await GetPropertyByIdAsync(property.Id, ct);
    }

    public async Task<PropertyDetailDto> UpdatePropertyAsync(Guid id, UpdatePropertyRequest request, CancellationToken ct = default)
    {
        var property = await _context.Properties.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (property == null)
        {
            throw new NotFoundException("Property", id);
        }

        if (!Enum.TryParse<PropertyType>(request.PropertyType, true, out var pType))
        {
            throw new ValidationException("PropertyType", "Invalid property type specified.");
        }

        property.Name = request.Name.Trim();
        property.Description = request.Description?.Trim();
        property.Address = request.Address.Trim();
        property.City = request.City.Trim();
        property.Country = request.Country.Trim();
        property.PropertyType = pType;

        await _context.SaveChangesAsync(ct);

        return await GetPropertyByIdAsync(id, ct);
    }

    public async Task DeletePropertyAsync(Guid id, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .Include(p => p.Buildings)
                .ThenInclude(b => b.Apartments)
                    .ThenInclude(a => a.Residents)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (property == null)
        {
            throw new NotFoundException("Property", id);
        }

        var hasActiveResidents = property.Buildings
            .SelectMany(b => b.Apartments)
            .SelectMany(a => a.Residents)
            .Any(r => r.Status == ResidentStatus.Active);

        if (hasActiveResidents)
        {
            throw new ConflictException("Cannot archive or delete property with active residents.");
        }

        _context.Properties.Remove(property);
        await _context.SaveChangesAsync(ct);
    }
}

