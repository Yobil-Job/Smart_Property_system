using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Users.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Exceptions;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
public class UsersController : BaseApiController
{
    private readonly IUserService _userService;
    private readonly ICurrentUserService _currentUserService;

    public UsersController(IUserService userService, ICurrentUserService currentUserService)
    {
        _userService = userService;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// Lists all users with pagination, role, and active status filtering (Admin only).
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "RequireAdminRole")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<UserSummaryDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<PagedResult<UserSummaryDto>>>> GetUsers([FromQuery] UserFilterDto filter, CancellationToken ct)
    {
        var result = await _userService.GetUsersAsync(filter, ct);
        return OkResponse(result, "Users retrieved successfully");
    }

    /// <summary>
    /// Retrieves user details by ID (Admin or Self).
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<UserDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserDetailDto>>> GetUser(Guid id, CancellationToken ct)
    {
        if (!_currentUserService.IsInRole(UserRoles.Administrator) && _currentUserService.UserId != id)
        {
            throw new ForbiddenException("You are not authorized to view another user's profile.");
        }

        var result = await _userService.GetUserByIdAsync(id, ct);
        return OkResponse(result, "User retrieved successfully");
    }

    /// <summary>
    /// Administratively creates a new user account with assigned role (Admin only).
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireAdminRole")]
    [ProducesResponseType(typeof(ApiResponse<UserSummaryDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<UserSummaryDto>>> CreateUser([FromBody] CreateUserRequestDto request, CancellationToken ct)
    {
        var result = await _userService.CreateUserAsync(request, ct);
        return CreatedResponse(nameof(GetUser), new { id = result.Id }, result, "User created successfully");
    }

    /// <summary>
    /// Updates user profile details (Admin or Self).
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<UserDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserDetailDto>>> UpdateUser(Guid id, [FromBody] UpdateUserRequestDto request, CancellationToken ct)
    {
        if (!_currentUserService.IsInRole(UserRoles.Administrator) && _currentUserService.UserId != id)
        {
            throw new ForbiddenException("You are not authorized to update another user's profile.");
        }

        var result = await _userService.UpdateUserAsync(id, request, ct);
        return OkResponse(result, "User updated successfully");
    }

    /// <summary>
    /// Activates or deactivates a user account (Admin only).
    /// </summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "RequireAdminRole")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse>> UpdateStatus(Guid id, [FromBody] UpdateUserStatusRequestDto request, CancellationToken ct)
    {
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        await _userService.UpdateUserStatusAsync(id, request, clientIp, ct);
        return OkMessage($"User status updated to {(request.IsActive ? "Active" : "Inactive")}");
    }

    /// <summary>
    /// Reassigns a user's system role (Admin only).
    /// </summary>
    [HttpPatch("{id:guid}/role")]
    [Authorize(Policy = "RequireAdminRole")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse>> UpdateRole(Guid id, [FromBody] UpdateUserRoleRequestDto request, CancellationToken ct)
    {
        await _userService.UpdateUserRoleAsync(id, request, ct);
        return OkMessage($"User role updated to '{request.Role}'");
    }
}

