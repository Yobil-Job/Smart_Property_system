using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Features.Buildings;
using SmartPropertyAI.Application.Features.Buildings.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class BuildingService : IBuildingService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public BuildingService(ApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<List<BuildingSummaryDto>> GetBuildingsByPropertyIdAsync(Guid propertyId, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == propertyId, ct);

        if (property == null)
        {
            throw new NotFoundException("Property", propertyId);
        }

        // Authorization checks
        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isResidentInProperty = await _context.Residents
                .AnyAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active &&
                               r.Apartment.Building.PropertyId == propertyId, ct);

            if (!isResidentInProperty)
            {
                throw new ForbiddenException("You do not have access to buildings in this property.");
            }
        }
        else if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isStaffAssigned = await _context.StaffMembers
                .AnyAsync(s => s.UserId == userId && s.PropertyId == propertyId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (!isStaffAssigned)
            {
                throw new ForbiddenException("You are not assigned to this property.");
            }
        }

        var buildings = await _context.Buildings
            .Include(b => b.Apartments)
            .Where(b => b.PropertyId == propertyId)
            .OrderBy(b => b.Name)
            .Select(b => new BuildingSummaryDto
            {
                Id = b.Id,
                PropertyId = b.PropertyId,
                PropertyName = property.Name,
                Name = b.Name,
                FloorCount = b.FloorCount,
                Description = b.Description,
                ApartmentCount = b.Apartments.Count,
                CreatedAt = b.CreatedAt
            })
            .ToListAsync(ct);

        return buildings;
    }

    public async Task<BuildingDetailDto> GetBuildingByIdAsync(Guid id, CancellationToken ct = default)
    {
        var building = await _context.Buildings
            .Include(b => b.Property)
            .Include(b => b.Apartments)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id, ct);

        if (building == null)
        {
            throw new NotFoundException("Building", id);
        }

        // Authorization checks
        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isResidentInBuilding = await _context.Residents
                .AnyAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active &&
                               r.Apartment.BuildingId == id, ct);

            if (!isResidentInBuilding)
            {
                throw new ForbiddenException("You do not have access to this building.");
            }
        }
        else if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isStaffAssigned = await _context.StaffMembers
                .AnyAsync(s => s.UserId == userId && s.PropertyId == building.PropertyId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (!isStaffAssigned)
            {
                throw new ForbiddenException("You are not assigned to the property containing this building.");
            }
        }

        return new BuildingDetailDto
        {
            Id = building.Id,
            PropertyId = building.PropertyId,
            PropertyName = building.Property.Name,
            Name = building.Name,
            FloorCount = building.FloorCount,
            Description = building.Description,
            CreatedAt = building.CreatedAt,
            UpdatedAt = building.UpdatedAt,
            Apartments = building.Apartments.Select(a => new ApartmentDtoInBuilding
            {
                Id = a.Id,
                ApartmentNumber = a.ApartmentNumber,
                Floor = a.Floor,
                NumberOfBedrooms = a.NumberOfBedrooms,
                NumberOfBathrooms = a.NumberOfBathrooms,
                OccupancyStatus = a.OccupancyStatus.ToString()
            }).ToList()
        };
    }

    public async Task<BuildingDetailDto> CreateBuildingAsync(Guid propertyId, CreateBuildingRequest request, CancellationToken ct = default)
    {
        var propertyExists = await _context.Properties.AnyAsync(p => p.Id == propertyId, ct);
        if (!propertyExists)
        {
            throw new NotFoundException("Property", propertyId);
        }

        var nameExists = await _context.Buildings
            .AnyAsync(b => b.PropertyId == propertyId && b.Name.ToLower() == request.Name.Trim().ToLower(), ct);

        if (nameExists)
        {
            throw new ConflictException($"A building named '{request.Name}' already exists in this property.");
        }

        var building = new Building
        {
            PropertyId = propertyId,
            Name = request.Name.Trim(),
            FloorCount = request.FloorCount,
            Description = request.Description?.Trim()
        };

        _context.Buildings.Add(building);
        await _context.SaveChangesAsync(ct);

        return await GetBuildingByIdAsync(building.Id, ct);
    }

    public async Task<BuildingDetailDto> UpdateBuildingAsync(Guid id, UpdateBuildingRequest request, CancellationToken ct = default)
    {
        var building = await _context.Buildings.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (building == null)
        {
            throw new NotFoundException("Building", id);
        }

        var nameExists = await _context.Buildings
            .AnyAsync(b => b.PropertyId == building.PropertyId && b.Id != id && b.Name.ToLower() == request.Name.Trim().ToLower(), ct);

        if (nameExists)
        {
            throw new ConflictException($"A building named '{request.Name}' already exists in this property.");
        }

        building.Name = request.Name.Trim();
        building.FloorCount = request.FloorCount;
        building.Description = request.Description?.Trim();

        await _context.SaveChangesAsync(ct);

        return await GetBuildingByIdAsync(id, ct);
    }

    public async Task DeleteBuildingAsync(Guid id, CancellationToken ct = default)
    {
        var building = await _context.Buildings
            .Include(b => b.Apartments)
                .ThenInclude(a => a.Residents)
            .FirstOrDefaultAsync(b => b.Id == id, ct);

        if (building == null)
        {
            throw new NotFoundException("Building", id);
        }

        var hasOccupiedApartments = building.Apartments
            .Any(a => a.OccupancyStatus != OccupancyStatus.Vacant || a.Residents.Any(r => r.Status == ResidentStatus.Active));

        if (hasOccupiedApartments)
        {
            throw new ConflictException("Cannot archive or delete building with occupied apartments or active residents.");
        }

        _context.Buildings.Remove(building);
        await _context.SaveChangesAsync(ct);
    }
}

