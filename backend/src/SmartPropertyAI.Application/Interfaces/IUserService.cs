using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Users.DTOs;

namespace SmartPropertyAI.Application.Interfaces;

public interface IUserService
{
    Task<PagedResult<UserSummaryDto>> GetUsersAsync(UserFilterDto filter, CancellationToken ct = default);
    Task<UserDetailDto> GetUserByIdAsync(Guid id, CancellationToken ct = default);
    Task<UserSummaryDto> CreateUserAsync(CreateUserRequestDto request, CancellationToken ct = default);
    Task<UserDetailDto> UpdateUserAsync(Guid id, UpdateUserRequestDto request, CancellationToken ct = default);
    Task UpdateUserStatusAsync(Guid id, UpdateUserStatusRequestDto request, string clientIp, CancellationToken ct = default);
    Task UpdateUserRoleAsync(Guid id, UpdateUserRoleRequestDto request, CancellationToken ct = default);
}

