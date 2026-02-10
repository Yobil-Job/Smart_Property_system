using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Users.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Identity;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ICurrentUserService _currentUserService;

    public UserService(
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        ApplicationDbContext dbContext,
        IJwtTokenService jwtTokenService,
        ICurrentUserService currentUserService)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _dbContext = dbContext;
        _jwtTokenService = jwtTokenService;
        _currentUserService = currentUserService;
    }

    public async Task<PagedResult<UserSummaryDto>> GetUsersAsync(UserFilterDto filter, CancellationToken ct = default)
    {
        var query = _userManager.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var search = filter.SearchTerm.Trim().ToLower();
            query = query.Where(u => u.Email!.ToLower().Contains(search) || u.FullName.ToLower().Contains(search));
        }

        if (filter.IsActive.HasValue)
        {
            query = query.Where(u => u.IsActive == filter.IsActive.Value);
        }

        var totalCount = await query.CountAsync(ct);

        var page = filter.PageNumber > 0 ? filter.PageNumber : 1;
        var size = filter.PageSize > 0 ? filter.PageSize : 10;

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);

        var summaries = new List<UserSummaryDto>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            if (!string.IsNullOrEmpty(filter.Role) && !roles.Contains(filter.Role))
            {
                continue;
            }

            summaries.Add(new UserSummaryDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                PhoneNumber = user.PhoneNumber ?? string.Empty,
                Role = roles.FirstOrDefault() ?? "None",
                IsActive = user.IsActive,
                CreatedAtUtc = user.CreatedAt
            });
        }

        return new PagedResult<UserSummaryDto>(summaries, totalCount, page, size);
    }

    public async Task<UserDetailDto> GetUserByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            throw new NotFoundException("User", id);
        }

        var roles = await _userManager.GetRolesAsync(user);

        return new UserDetailDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            PhoneNumber = user.PhoneNumber ?? string.Empty,
            Roles = roles,
            IsActive = user.IsActive,
            CreatedAtUtc = user.CreatedAt,
            UpdatedAtUtc = user.UpdatedAt
        };
    }

    public async Task<UserSummaryDto> CreateUserAsync(CreateUserRequestDto request, CancellationToken ct = default)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            throw new ConflictException($"User with email '{request.Email}' already exists.");
        }

        if (!UserRoles.AllRoles.Contains(request.Role))
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Role", new[] { $"Role '{request.Role}' is invalid. Allowed roles: {string.Join(", ", UserRoles.AllRoles)}" } }
            });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, request.InitialPassword);
        if (!result.Succeeded)
        {
            var errors = result.Errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());
            throw new ValidationException(errors);
        }

        await _userManager.AddToRoleAsync(user, request.Role);

        return new UserSummaryDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = request.Role,
            IsActive = user.IsActive,
            CreatedAtUtc = user.CreatedAt
        };
    }

    public async Task<UserDetailDto> UpdateUserAsync(Guid id, UpdateUserRequestDto request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            throw new NotFoundException("User", id);
        }

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = request.PhoneNumber.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            var errors = result.Errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());
            throw new ValidationException(errors);
        }

        var roles = await _userManager.GetRolesAsync(user);

        return new UserDetailDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            PhoneNumber = user.PhoneNumber ?? string.Empty,
            Roles = roles,
            IsActive = user.IsActive,
            CreatedAtUtc = user.CreatedAt,
            UpdatedAtUtc = user.UpdatedAt
        };
    }

    public async Task UpdateUserStatusAsync(Guid id, UpdateUserStatusRequestDto request, string clientIp, CancellationToken ct = default)
    {
        if (_currentUserService.UserId == id && !request.IsActive)
        {
            throw new ConflictException("Administrators cannot deactivate their own account.");
        }

        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            throw new NotFoundException("User", id);
        }

        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _userManager.UpdateAsync(user);

        if (!request.IsActive)
        {
            await _jwtTokenService.RevokeAllUserRefreshTokensAsync(id, request.Reason ?? "Account deactivated", clientIp, ct);
        }
    }

    public async Task UpdateUserRoleAsync(Guid id, UpdateUserRoleRequestDto request, CancellationToken ct = default)
    {
        if (!UserRoles.AllRoles.Contains(request.Role))
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Role", new[] { $"Role '{request.Role}' is invalid. Allowed roles: {string.Join(", ", UserRoles.AllRoles)}" } }
            });
        }

        if (_currentUserService.UserId == id && request.Role != UserRoles.Administrator)
        {
            throw new ConflictException("Administrators cannot revoke their own Administrator role.");
        }

        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            throw new NotFoundException("User", id);
        }

        var currentRoles = await _userManager.GetRolesAsync(user);
        await _userManager.RemoveFromRolesAsync(user, currentRoles);
        await _userManager.AddToRoleAsync(user, request.Role);

        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
    }
}

