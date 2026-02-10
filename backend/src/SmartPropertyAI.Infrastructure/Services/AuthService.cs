using Microsoft.AspNetCore.Identity;
using SmartPropertyAI.Application.Features.Authentication.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Identity;

namespace SmartPropertyAI.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        IJwtTokenService jwtTokenService)
    {
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, string clientIp, CancellationToken ct = default)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            throw new ConflictException($"User with email '{request.Email}' already exists.");
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

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());
            throw new ValidationException(errors);
        }

        // Self-registration is strictly restricted to Resident role
        await _userManager.AddToRoleAsync(user, UserRoles.Resident);

        var roles = new List<string> { UserRoles.Resident };

        return await _jwtTokenService.GenerateTokensAsync(
            user.Id,
            user.Email!,
            user.FullName,
            roles,
            clientIp,
            ct);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request, string clientIp, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            throw new UnauthorizedException("Invalid email or password.");
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            throw new UnauthorizedException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new ForbiddenException("Your account has been deactivated. Please contact the property administrator.");
        }

        var roles = await _userManager.GetRolesAsync(user);

        return await _jwtTokenService.GenerateTokensAsync(
            user.Id,
            user.Email ?? string.Empty,
            user.FullName,
            roles,
            clientIp,
            ct);
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request, string clientIp, CancellationToken ct = default)
    {
        return await _jwtTokenService.RefreshTokensAsync(request.AccessToken, request.RefreshToken, clientIp, ct);
    }

    public async Task LogoutAsync(LogoutRequestDto request, string clientIp, CancellationToken ct = default)
    {
        await _jwtTokenService.RevokeRefreshTokenAsync(request.RefreshToken, clientIp, ct);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequestDto request, string clientIp, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
        {
            throw new NotFoundException("User", userId);
        }

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = result.Errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());
            throw new ValidationException(errors);
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        // Security best practice: Invalidate all existing refresh tokens to force re-login on other devices
        await _jwtTokenService.RevokeAllUserRefreshTokensAsync(userId, "Password changed", clientIp, ct);
    }

    public async Task<CurrentUserProfileDto> GetCurrentUserProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
        {
            throw new NotFoundException("User", userId);
        }

        var roles = await _userManager.GetRolesAsync(user);

        return new CurrentUserProfileDto
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber ?? string.Empty,
            Roles = roles,
            IsActive = user.IsActive,
            CreatedAtUtc = user.CreatedAt
        };
    }
}

