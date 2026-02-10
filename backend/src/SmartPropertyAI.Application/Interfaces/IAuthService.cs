using SmartPropertyAI.Application.Features.Authentication.DTOs;

namespace SmartPropertyAI.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, string clientIp, CancellationToken ct = default);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request, string clientIp, CancellationToken ct = default);
    Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request, string clientIp, CancellationToken ct = default);
    Task LogoutAsync(LogoutRequestDto request, string clientIp, CancellationToken ct = default);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequestDto request, string clientIp, CancellationToken ct = default);
    Task<CurrentUserProfileDto> GetCurrentUserProfileAsync(Guid userId, CancellationToken ct = default);
}

