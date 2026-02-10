using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Staff;
using SmartPropertyAI.Application.Features.Staff.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Identity;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class StaffService : IStaffService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ICurrentUserService _currentUserService;

    public StaffService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _userManager = userManager;
        _currentUserService = currentUserService;
    }

    public async Task<PagedResult<StaffSummaryDto>> GetStaffMembersAsync(StaffFilterDto filter, CancellationToken ct = default)
    {
        var query = _context.StaffMembers
            .Include(s => s.Property)
            .AsNoTracking()
            .AsQueryable();

        if (filter.PropertyId.HasValue)
        {
            query = query.Where(s => s.PropertyId == filter.PropertyId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Position))
        {
            var pos = filter.Position.Trim().ToLower();
            query = query.Where(s => s.Position.ToLower().Contains(pos));
        }

        if (!string.IsNullOrWhiteSpace(filter.EmploymentStatus) && Enum.TryParse<EmploymentStatus>(filter.EmploymentStatus, true, out var eStatus))
        {
            query = query.Where(s => s.EmploymentStatus == eStatus);
        }

        var staffUserIds = await query.Select(s => s.UserId).ToListAsync(ct);
        var users = await _context.Users
            .Where(u => staffUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => new { u.FullName, u.Email, u.PhoneNumber }, ct);

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var search = filter.SearchTerm.Trim().ToLower();
            var matchingUserIds = users.Values
                .Where(u => u.FullName.ToLower().Contains(search) || u.Email!.ToLower().Contains(search))
                .Select(u => users.First(kv => kv.Value == u).Key)
                .ToList();

            query = query.Where(s => s.EmployeeNumber.ToLower().Contains(search) || matchingUserIds.Contains(s.UserId));
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(s => new StaffSummaryDto
            {
                Id = s.Id,
                UserId = s.UserId,
                PropertyId = s.PropertyId,
                PropertyName = s.Property.Name,
                EmployeeNumber = s.EmployeeNumber,
                Position = s.Position,
                EmploymentStatus = s.EmploymentStatus.ToString(),
                CreatedAt = s.CreatedAt
            })
            .ToListAsync(ct);

        foreach (var item in items)
        {
            if (users.TryGetValue(item.UserId, out var u))
            {
                item.FullName = u.FullName;
                item.Email = u.Email!;
                item.PhoneNumber = u.PhoneNumber;
            }
        }

        return new PagedResult<StaffSummaryDto>(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<StaffDetailDto> GetStaffByIdAsync(Guid id, CancellationToken ct = default)
    {
        var staff = await _context.StaffMembers
            .Include(s => s.Property)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (staff == null)
        {
            throw new NotFoundException("Staff", id);
        }

        // Authorization checks
        if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            if (_currentUserService.UserId != staff.UserId)
            {
                throw new ForbiddenException("You can only view your own staff profile.");
            }
        }

        var user = await _userManager.FindByIdAsync(staff.UserId.ToString());

        return MapToDetailDto(staff, user);
    }

    public async Task<StaffDetailDto> GetStaffByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        var staff = await _context.StaffMembers
            .Include(s => s.Property)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.EmploymentStatus == EmploymentStatus.Active, ct);

        if (staff == null)
        {
            throw new NotFoundException("Active staff profile for user", userId);
        }

        var user = await _userManager.FindByIdAsync(userId.ToString());
        return MapToDetailDto(staff, user);
    }

    public async Task<StaffDetailDto> CreateStaffAsync(CreateStaffRequest request, CancellationToken ct = default)
    {
        var employeeNumberExists = await _context.StaffMembers
            .AnyAsync(s => s.EmployeeNumber.ToLower() == request.EmployeeNumber.Trim().ToLower(), ct);

        if (employeeNumberExists)
        {
            throw new ConflictException($"Employee number '{request.EmployeeNumber}' is already in use.");
        }

        var user = await _userManager.FindByIdAsync(request.UserId.ToString());
        if (user == null)
        {
            throw new NotFoundException("User", request.UserId);
        }

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains(UserRoles.Staff))
        {
            throw new ValidationException("UserId", "The specified user does not possess the 'Staff' role.");
        }

        var alreadyStaff = await _context.StaffMembers
            .AnyAsync(s => s.UserId == request.UserId && s.EmploymentStatus != EmploymentStatus.Terminated, ct);

        if (alreadyStaff)
        {
            throw new ConflictException("The user is already onboarded as active staff.");
        }

        var property = await _context.Properties.FirstOrDefaultAsync(p => p.Id == request.PropertyId, ct);
        if (property == null)
        {
            throw new NotFoundException("Property", request.PropertyId);
        }

        var staff = new Staff
        {
            UserId = user.Id,
            PropertyId = property.Id,
            EmployeeNumber = request.EmployeeNumber.Trim(),
            Position = request.Position.Trim(),
            EmploymentStatus = EmploymentStatus.Active
        };

        _context.StaffMembers.Add(staff);
        await _context.SaveChangesAsync(ct);

        return await GetStaffByIdAsync(staff.Id, ct);
    }

    public async Task<StaffDetailDto> UpdateStaffAsync(Guid id, UpdateStaffRequest request, CancellationToken ct = default)
    {
        var staff = await _context.StaffMembers.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (staff == null)
        {
            throw new NotFoundException("Staff", id);
        }

        if (request.PropertyId.HasValue)
        {
            var propertyExists = await _context.Properties.AnyAsync(p => p.Id == request.PropertyId.Value, ct);
            if (!propertyExists)
            {
                throw new NotFoundException("Property", request.PropertyId.Value);
            }
            staff.PropertyId = request.PropertyId.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.Position))
        {
            staff.Position = request.Position.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.EmploymentStatus) && Enum.TryParse<EmploymentStatus>(request.EmploymentStatus, true, out var newStatus))
        {
            staff.EmploymentStatus = newStatus;
        }

        await _context.SaveChangesAsync(ct);

        return await GetStaffByIdAsync(id, ct);
    }

    public async Task<StaffTaskOverviewDto> GetMyTasksAsync(Guid userId, CancellationToken ct = default)
    {
        var staff = await GetStaffByUserIdAsync(userId, ct);

        return new StaffTaskOverviewDto
        {
            StaffMember = staff,
            ActiveTasksCount = 0,
            PendingTasks = new List<string>()
        };
    }

    private static StaffDetailDto MapToDetailDto(Staff staff, ApplicationUser? user)
    {
        return new StaffDetailDto
        {
            Id = staff.Id,
            UserId = staff.UserId,
            FullName = user?.FullName ?? string.Empty,
            Email = user?.Email ?? string.Empty,
            PhoneNumber = user?.PhoneNumber,
            PropertyId = staff.PropertyId,
            PropertyName = staff.Property?.Name ?? string.Empty,
            PropertyAddress = staff.Property?.Address ?? string.Empty,
            EmployeeNumber = staff.EmployeeNumber,
            Position = staff.Position,
            EmploymentStatus = staff.EmploymentStatus.ToString(),
            CreatedAt = staff.CreatedAt,
            UpdatedAt = staff.UpdatedAt
        };
    }
}

