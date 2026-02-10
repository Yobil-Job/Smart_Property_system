using SmartPropertyAI.Application.Features.Authentication.DTOs;

namespace SmartPropertyAI.Application.Interfaces;

public interface IJwtTokenService
{
    Task<AuthResponseDto> GenerateTokensAsync(Guid userId, string email, string fullName, IList<string> roles, string clientIp, CancellationToken ct = default);
    Task<AuthResponseDto> RefreshTokensAsync(string accessToken, string refreshToken, string clientIp, CancellationToken ct = default);
    Task RevokeRefreshTokenAsync(string refreshToken, string clientIp, CancellationToken ct = default);
    Task RevokeAllUserRefreshTokensAsync(Guid userId, string reason, string clientIp, CancellationToken ct = default);
}

