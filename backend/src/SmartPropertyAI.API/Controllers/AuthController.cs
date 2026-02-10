using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Authentication.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Exceptions;

namespace SmartPropertyAI.API.Controllers;

public class AuthController : BaseApiController
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUserService;

    public AuthController(IAuthService authService, ICurrentUserService currentUserService)
    {
        _authService = authService;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// Self-registration for residents. Automatically assigns the Resident role.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Register([FromBody] RegisterRequestDto request, CancellationToken ct)
    {
        var clientIp = GetClientIpAddress();
        var result = await _authService.RegisterAsync(request, clientIp, ct);
        return CreatedResponse(nameof(GetMe), null, result, "User registered successfully");
    }

    /// <summary>
    /// Authenticates a user and issues a JWT access token and refresh token.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login([FromBody] LoginRequestDto request, CancellationToken ct)
    {
        var clientIp = GetClientIpAddress();
        var result = await _authService.LoginAsync(request, clientIp, ct);
        return OkResponse(result, "Login successful");
    }

    /// <summary>
    /// Rotates an active refresh token and returns a new token pair.
    /// </summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> RefreshToken([FromBody] RefreshTokenRequestDto request, CancellationToken ct)
    {
        var clientIp = GetClientIpAddress();
        var result = await _authService.RefreshTokenAsync(request, clientIp, ct);
        return OkResponse(result, "Token refreshed successfully");
    }

    /// <summary>
    /// Revokes an active refresh token.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse>> Logout([FromBody] LogoutRequestDto request, CancellationToken ct)
    {
        var clientIp = GetClientIpAddress();
        await _authService.LogoutAsync(request, clientIp, ct);
        return OkMessage("Logged out successfully");
    }

    /// <summary>
    /// Updates the password of the currently authenticated user.
    /// </summary>
    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse>> ChangePassword([FromBody] ChangePasswordRequestDto request, CancellationToken ct)
    {
        if (!_currentUserService.UserId.HasValue)
        {
            throw new UnauthorizedException();
        }

        var clientIp = GetClientIpAddress();
        await _authService.ChangePasswordAsync(_currentUserService.UserId.Value, request, clientIp, ct);
        return OkMessage("Password changed successfully. All other active sessions have been terminated.");
    }

    /// <summary>
    /// Retrieves the profile and roles of the current authenticated user.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<CurrentUserProfileDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<CurrentUserProfileDto>>> GetMe(CancellationToken ct)
    {
        if (!_currentUserService.UserId.HasValue)
        {
            throw new UnauthorizedException();
        }

        var profile = await _authService.GetCurrentUserProfileAsync(_currentUserService.UserId.Value, ct);
        return OkResponse(profile, "User profile retrieved");
    }

    private string GetClientIpAddress()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
    }
}

