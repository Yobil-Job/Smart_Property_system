using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Apartments;
using SmartPropertyAI.Application.Features.Apartments.DTOs;
using SmartPropertyAI.Application.Features.Residents;
using SmartPropertyAI.Application.Features.Residents.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Identity;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class ResidentService : IResidentService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ICurrentUserService _currentUserService;
    private readonly IApartmentService _apartmentService;

    public ResidentService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        ICurrentUserService currentUserService,
        IApartmentService apartmentService)
    {
        _context = context;
        _userManager = userManager;
        _currentUserService = currentUserService;
        _apartmentService = apartmentService;
    }

    public async Task<PagedResult<ResidentSummaryDto>> GetResidentsAsync(ResidentFilterDto filter, CancellationToken ct = default)
    {
        var query = _context.Residents
            .Include(r => r.Apartment)
                .ThenInclude(a => a.Building)
                    .ThenInclude(b => b.Property)
            .AsNoTracking()
            .AsQueryable();

        if (filter.PropertyId.HasValue)
        {
            query = query.Where(r => r.Apartment.Building.PropertyId == filter.PropertyId.Value);
        }

        if (filter.BuildingId.HasValue)
        {
            query = query.Where(r => r.Apartment.BuildingId == filter.BuildingId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<ResidentStatus>(filter.Status, true, out var rStatus))
        {
            query = query.Where(r => r.Status == rStatus);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var search = filter.SearchTerm.Trim().ToLower();
            query = query.Where(r => r.FullName.ToLower().Contains(search) || r.Email.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(r => new ResidentSummaryDto
            {
                Id = r.Id,
                UserId = r.UserId,
                FullName = r.FullName,
                Email = r.Email,
                PhoneNumber = r.PhoneNumber,
                ApartmentId = r.ApartmentId,
                ApartmentNumber = r.Apartment.ApartmentNumber,
                BuildingId = r.Apartment.BuildingId,
                BuildingName = r.Apartment.Building.Name,
                PropertyId = r.Apartment.Building.PropertyId,
                PropertyName = r.Apartment.Building.Property.Name,
                Status = r.Status.ToString(),
                MoveInDate = r.MoveInDate,
                MoveOutDate = r.MoveOutDate,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<ResidentSummaryDto>(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<ResidentDetailDto> GetResidentByIdAsync(Guid id, CancellationToken ct = default)
    {
        var resident = await _context.Residents
            .Include(r => r.Apartment)
                .ThenInclude(a => a.Building)
                    .ThenInclude(b => b.Property)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (resident == null)
        {
            throw new NotFoundException("Resident", id);
        }

        // Authorization checks
        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            if (_currentUserService.UserId != resident.UserId)
            {
                throw new ForbiddenException("You can only view your own resident profile.");
            }
        }
        else if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isStaffAssigned = await _context.StaffMembers
                .AnyAsync(s => s.UserId == userId && s.PropertyId == resident.Apartment.Building.PropertyId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (!isStaffAssigned)
            {
                throw new ForbiddenException("You are not assigned to this resident's property.");
            }
        }

        return MapToDetailDto(resident);
    }

    public async Task<ResidentDetailDto> GetResidentByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        var resident = await _context.Residents
            .Include(r => r.Apartment)
                .ThenInclude(a => a.Building)
                    .ThenInclude(b => b.Property)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active, ct);

        if (resident == null)
        {
            throw new NotFoundException("Active resident profile for user", userId);
        }

        return MapToDetailDto(resident);
    }

    public async Task<ResidentDetailDto> CreateResidentAsync(CreateResidentRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(request.UserId.ToString());
        if (user == null)
        {
            throw new NotFoundException("User", request.UserId);
        }

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains(UserRoles.Resident))
        {
            throw new ValidationException("UserId", "The specified user does not possess the 'Resident' role.");
        }

        var alreadyActiveResident = await _context.Residents
            .AnyAsync(r => r.UserId == request.UserId && r.Status == ResidentStatus.Active, ct);

        if (alreadyActiveResident)
        {
            throw new ConflictException("The user is already registered as an active resident.");
        }

        var apartment = await _context.Apartments.FirstOrDefaultAsync(a => a.Id == request.ApartmentId, ct);
        if (apartment == null)
        {
            throw new NotFoundException("Apartment", request.ApartmentId);
        }

        var resident = new Resident
        {
            UserId = user.Id,
            ApartmentId = apartment.Id,
            FullName = user.FullName,
            Email = user.Email!,
            PhoneNumber = user.PhoneNumber,
            EmergencyContact = request.EmergencyContact?.Trim(),
            MoveInDate = request.MoveInDate,
            Status = ResidentStatus.Active
        };

        // Automatically mark the apartment as Occupied
        apartment.OccupancyStatus = OccupancyStatus.Occupied;

        _context.Residents.Add(resident);
        await _context.SaveChangesAsync(ct);

        return await GetResidentByIdAsync(resident.Id, ct);
    }

    public async Task<ResidentDetailDto> UpdateResidentAsync(Guid id, UpdateResidentRequest request, CancellationToken ct = default)
    {
        var resident = await _context.Residents
            .Include(r => r.Apartment)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (resident == null)
        {
            throw new NotFoundException("Resident", id);
        }

        // Authorization checks
        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            if (_currentUserService.UserId != resident.UserId)
            {
                throw new ForbiddenException("You can only modify your own resident profile.");
            }

            // Residents can update their emergency contact and phone number
            if (request.EmergencyContact != null) resident.EmergencyContact = request.EmergencyContact.Trim();
            if (request.PhoneNumber != null) resident.PhoneNumber = request.PhoneNumber.Trim();
        }
        else
        {
            // Admin can update all fields
            if (request.EmergencyContact != null) resident.EmergencyContact = request.EmergencyContact.Trim();
            if (request.PhoneNumber != null) resident.PhoneNumber = request.PhoneNumber.Trim();
            if (!string.IsNullOrWhiteSpace(request.FullName)) resident.FullName = request.FullName.Trim();
            if (request.MoveOutDate.HasValue) resident.MoveOutDate = request.MoveOutDate.Value;

            if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<ResidentStatus>(request.Status, true, out var newStatus))
            {
                resident.Status = newStatus;
                if (newStatus == ResidentStatus.Inactive)
                {
                    // Check if other active residents exist in this apartment
                    var hasOtherActiveResidents = await _context.Residents
                        .AnyAsync(r => r.ApartmentId == resident.ApartmentId && r.Id != id && r.Status == ResidentStatus.Active, ct);

                    if (!hasOtherActiveResidents)
                    {
                        resident.Apartment.OccupancyStatus = OccupancyStatus.Vacant;
                    }
                }
            }
        }

        await _context.SaveChangesAsync(ct);

        return await GetResidentByIdAsync(id, ct);
    }

    public async Task<ApartmentDetailDto> GetApartmentForResidentAsync(Guid residentId, CancellationToken ct = default)
    {
        var resident = await _context.Residents
            .Include(r => r.Apartment)
                .ThenInclude(a => a.Building)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == residentId, ct);

        if (resident == null)
        {
            throw new NotFoundException("Resident", residentId);
        }

        // Authorization checks
        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            if (_currentUserService.UserId != resident.UserId)
            {
                throw new ForbiddenException("You can only view your own apartment details.");
            }
        }
        else if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var isStaffAssigned = await _context.StaffMembers
                .AnyAsync(s => s.UserId == userId && s.PropertyId == resident.Apartment.Building.PropertyId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (!isStaffAssigned)
            {
                throw new ForbiddenException("You are not assigned to this resident's property.");
            }
        }

        return await _apartmentService.GetApartmentByIdAsync(resident.ApartmentId, ct);
    }

    private static ResidentDetailDto MapToDetailDto(Resident resident)
    {
        return new ResidentDetailDto
        {
            Id = resident.Id,
            UserId = resident.UserId,
            FullName = resident.FullName,
            Email = resident.Email,
            PhoneNumber = resident.PhoneNumber,
            EmergencyContact = resident.EmergencyContact,
            ApartmentId = resident.ApartmentId,
            ApartmentNumber = resident.Apartment.ApartmentNumber,
            Floor = resident.Apartment.Floor,
            NumberOfBedrooms = resident.Apartment.NumberOfBedrooms,
            NumberOfBathrooms = resident.Apartment.NumberOfBathrooms,
            BuildingId = resident.Apartment.BuildingId,
            BuildingName = resident.Apartment.Building.Name,
            PropertyId = resident.Apartment.Building.PropertyId,
            PropertyName = resident.Apartment.Building.Property.Name,
            PropertyAddress = resident.Apartment.Building.Property.Address,
            Status = resident.Status.ToString(),
            MoveInDate = resident.MoveInDate,
            MoveOutDate = resident.MoveOutDate,
            CreatedAt = resident.CreatedAt,
            UpdatedAt = resident.UpdatedAt
        };
    }
}

