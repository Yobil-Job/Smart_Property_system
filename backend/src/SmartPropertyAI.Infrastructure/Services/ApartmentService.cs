using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Apartments;
using SmartPropertyAI.Application.Features.Apartments.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class ApartmentService : IApartmentService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ApartmentService(ApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<PagedResult<ApartmentSummaryDto>> GetApartmentsByBuildingIdAsync(Guid buildingId, ApartmentFilterDto filter, CancellationToken ct = default)
    {
        var building = await _context.Buildings
            .Include(b => b.Property)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == buildingId, ct);

        if (building == null)
        {
            throw new NotFoundException("Building", buildingId);
        }

        // Staff can only view physical units within their assigned properties
        if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isStaffAssigned = await _context.StaffMembers
                .AnyAsync(s => s.UserId == userId && s.PropertyId == building.PropertyId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (!isStaffAssigned)
            {
                throw new ForbiddenException("You are not assigned to the property containing this building.");
            }
        }

        var query = _context.Apartments
            .AsNoTracking()
            .Where(a => a.BuildingId == buildingId);

        if (!string.IsNullOrWhiteSpace(filter.OccupancyStatus) && Enum.TryParse<OccupancyStatus>(filter.OccupancyStatus, true, out var occStatus))
        {
            query = query.Where(a => a.OccupancyStatus == occStatus);
        }

        if (filter.Floor.HasValue)
        {
            query = query.Where(a => a.Floor == filter.Floor.Value);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderBy(a => a.Floor)
            .ThenBy(a => a.ApartmentNumber)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(a => new ApartmentSummaryDto
            {
                Id = a.Id,
                BuildingId = a.BuildingId,
                BuildingName = building.Name,
                PropertyId = building.PropertyId,
                PropertyName = building.Property.Name,
                ApartmentNumber = a.ApartmentNumber,
                Floor = a.Floor,
                NumberOfBedrooms = a.NumberOfBedrooms,
                NumberOfBathrooms = a.NumberOfBathrooms,
                OccupancyStatus = a.OccupancyStatus.ToString(),
                CreatedAt = a.CreatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<ApartmentSummaryDto>(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<ApartmentDetailDto> GetApartmentByIdAsync(Guid id, CancellationToken ct = default)
    {
        var apartment = await _context.Apartments
            .Include(a => a.Building)
                .ThenInclude(b => b.Property)
            .Include(a => a.Residents)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (apartment == null)
        {
            throw new NotFoundException("Apartment", id);
        }

        // Authorization checks
        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator) && !_currentUserService.IsInRole(UserRoles.Staff))
        {
            var userId = _currentUserService.UserId;
            var isResidentInApartment = apartment.Residents.Any(r => r.UserId == userId && r.Status == ResidentStatus.Active);
            if (!isResidentInApartment)
            {
                throw new ForbiddenException("You do not have access to this apartment unit.");
            }
        }
        else if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isStaffAssigned = await _context.StaffMembers
                .AnyAsync(s => s.UserId == userId && s.PropertyId == apartment.Building.PropertyId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (!isStaffAssigned)
            {
                throw new ForbiddenException("You are not assigned to the property containing this apartment.");
            }
        }

        return new ApartmentDetailDto
        {
            Id = apartment.Id,
            BuildingId = apartment.BuildingId,
            BuildingName = apartment.Building.Name,
            PropertyId = apartment.Building.PropertyId,
            PropertyName = apartment.Building.Property.Name,
            ApartmentNumber = apartment.ApartmentNumber,
            Floor = apartment.Floor,
            NumberOfBedrooms = apartment.NumberOfBedrooms,
            NumberOfBathrooms = apartment.NumberOfBathrooms,
            OccupancyStatus = apartment.OccupancyStatus.ToString(),
            CreatedAt = apartment.CreatedAt,
            UpdatedAt = apartment.UpdatedAt,
            Residents = apartment.Residents.Select(r => new ResidentDtoInApartment
            {
                Id = r.Id,
                UserId = r.UserId,
                FullName = r.FullName,
                Email = r.Email,
                PhoneNumber = r.PhoneNumber,
                Status = r.Status.ToString(),
                MoveInDate = r.MoveInDate,
                MoveOutDate = r.MoveOutDate
            }).ToList()
        };
    }

    public async Task<ApartmentDetailDto> CreateApartmentAsync(Guid buildingId, CreateApartmentRequest request, CancellationToken ct = default)
    {
        var building = await _context.Buildings.FirstOrDefaultAsync(b => b.Id == buildingId, ct);
        if (building == null)
        {
            throw new NotFoundException("Building", buildingId);
        }

        var numberExists = await _context.Apartments
            .AnyAsync(a => a.BuildingId == buildingId && a.ApartmentNumber.ToLower() == request.ApartmentNumber.Trim().ToLower(), ct);

        if (numberExists)
        {
            throw new ConflictException($"Apartment number '{request.ApartmentNumber}' already exists in this building.");
        }

        var apartment = new Apartment
        {
            BuildingId = buildingId,
            ApartmentNumber = request.ApartmentNumber.Trim(),
            Floor = request.Floor,
            NumberOfBedrooms = request.NumberOfBedrooms,
            NumberOfBathrooms = request.NumberOfBathrooms,
            OccupancyStatus = OccupancyStatus.Vacant
        };

        _context.Apartments.Add(apartment);
        await _context.SaveChangesAsync(ct);

        return await GetApartmentByIdAsync(apartment.Id, ct);
    }

    public async Task<ApartmentDetailDto> UpdateApartmentAsync(Guid id, UpdateApartmentRequest request, CancellationToken ct = default)
    {
        var apartment = await _context.Apartments.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (apartment == null)
        {
            throw new NotFoundException("Apartment", id);
        }

        var numberExists = await _context.Apartments
            .AnyAsync(a => a.BuildingId == apartment.BuildingId && a.Id != id && a.ApartmentNumber.ToLower() == request.ApartmentNumber.Trim().ToLower(), ct);

        if (numberExists)
        {
            throw new ConflictException($"Apartment number '{request.ApartmentNumber}' already exists in this building.");
        }

        apartment.ApartmentNumber = request.ApartmentNumber.Trim();
        apartment.Floor = request.Floor;
        apartment.NumberOfBedrooms = request.NumberOfBedrooms;
        apartment.NumberOfBathrooms = request.NumberOfBathrooms;

        await _context.SaveChangesAsync(ct);

        return await GetApartmentByIdAsync(id, ct);
    }

    public async Task<ApartmentDetailDto> UpdateOccupancyStatusAsync(Guid id, UpdateOccupancyRequest request, CancellationToken ct = default)
    {
        var apartment = await _context.Apartments
            .Include(a => a.Building)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (apartment == null)
        {
            throw new NotFoundException("Apartment", id);
        }

        // Staff check
        if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isStaffAssigned = await _context.StaffMembers
                .AnyAsync(s => s.UserId == userId && s.PropertyId == apartment.Building.PropertyId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (!isStaffAssigned)
            {
                throw new ForbiddenException("You are not assigned to the property containing this apartment.");
            }
        }

        if (!Enum.TryParse<OccupancyStatus>(request.OccupancyStatus, true, out var newStatus))
        {
            throw new ValidationException("OccupancyStatus", "Invalid occupancy status specified.");
        }

        apartment.OccupancyStatus = newStatus;
        await _context.SaveChangesAsync(ct);

        return await GetApartmentByIdAsync(id, ct);
    }
}

