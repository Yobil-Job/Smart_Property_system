using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartPropertyAI.Application.Features.Authentication.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Identity;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class JwtTokenService : IJwtTokenService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;

    public JwtTokenService(
        ApplicationDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _userManager = userManager;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> GenerateTokensAsync(
        Guid userId,
        string email,
        string fullName,
        IList<string> roles,
        string clientIp,
        CancellationToken ct = default)
    {
        var secretKey = _configuration["JwtSettings:SecretKey"]
            ?? throw new InvalidOperationException("JwtSettings:SecretKey is not configured.");
        var issuer = _configuration["JwtSettings:Issuer"] ?? "SmartPropertyAI";
        var audience = _configuration["JwtSettings:Audience"] ?? "SmartPropertyAI_Clients";
        var expirationMinutes = int.TryParse(_configuration["JwtSettings:AccessTokenExpirationMinutes"], out var mins) ? mins : 60;
        var refreshDays = int.TryParse(_configuration["JwtSettings:RefreshTokenExpirationDays"], out var days) ? days : 7;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jti = Guid.NewGuid().ToString();
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Name, fullName),
            new(JwtRegisteredClaimNames.Jti, jti)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var expiresAtUtc = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAtUtc,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var securityToken = tokenHandler.CreateToken(tokenDescriptor);
        var accessToken = tokenHandler.WriteToken(securityToken);

        // Generate cryptographically secure refresh token
        var rawRefreshToken = GenerateSecureRandomToken();
        var tokenHash = HashToken(rawRefreshToken);

        var refreshTokenEntity = new RefreshToken
        {
            UserId = userId,
            TokenHash = tokenHash,
            JwtId = jti,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(refreshDays),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByIp = clientIp
        };

        _dbContext.RefreshTokens.Add(refreshTokenEntity);
        await _dbContext.SaveChangesAsync(ct);

        return new AuthResponseDto
        {
            UserId = userId,
            FullName = fullName,
            Email = email,
            Role = roles.FirstOrDefault() ?? "Resident",
            AccessToken = accessToken,
            RefreshToken = rawRefreshToken,
            ExpiresAtUtc = expiresAtUtc
        };
    }

    public async Task<AuthResponseDto> RefreshTokensAsync(
        string accessToken,
        string refreshToken,
        string clientIp,
        CancellationToken ct = default)
    {
        var tokenHash = HashToken(refreshToken);

        var storedToken = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);

        if (storedToken == null)
        {
            throw new UnauthorizedException("Invalid refresh token.");
        }

        // Replay attack detection: If already revoked, revoke ALL active tokens for this user immediately!
        if (storedToken.IsRevoked)
        {
            await RevokeAllUserRefreshTokensAsync(storedToken.UserId, "Replay attack detected on already revoked token", clientIp, ct);
            throw new UnauthorizedException("Security violation: Token reuse detected. All active sessions have been terminated.");
        }

        if (storedToken.IsExpired)
        {
            throw new UnauthorizedException("Refresh token has expired. Please log in again.");
        }

        var user = await _userManager.FindByIdAsync(storedToken.UserId.ToString());
        if (user == null || !user.IsActive)
        {
            throw new ForbiddenException("User account is inactive or no longer exists.");
        }

        var roles = await _userManager.GetRolesAsync(user);

        // Rotate: revoke the old token and register the replacement
        var rawNewRefreshToken = GenerateSecureRandomToken();
        var newHash = HashToken(rawNewRefreshToken);

        storedToken.RevokedAtUtc = DateTime.UtcNow;
        storedToken.RevokedByIp = clientIp;
        storedToken.ReplacedByTokenHash = newHash;

        var secretKey = _configuration["JwtSettings:SecretKey"]!;
        var issuer = _configuration["JwtSettings:Issuer"] ?? "SmartPropertyAI";
        var audience = _configuration["JwtSettings:Audience"] ?? "SmartPropertyAI_Clients";
        var expirationMinutes = int.TryParse(_configuration["JwtSettings:AccessTokenExpirationMinutes"], out var mins) ? mins : 60;
        var refreshDays = int.TryParse(_configuration["JwtSettings:RefreshTokenExpirationDays"], out var days) ? days : 7;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jti = Guid.NewGuid().ToString();
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Name, user.FullName),
            new(JwtRegisteredClaimNames.Jti, jti)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var expiresAtUtc = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAtUtc,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var securityToken = tokenHandler.CreateToken(tokenDescriptor);
        var newAccessToken = tokenHandler.WriteToken(securityToken);

        var newRefreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = newHash,
            JwtId = jti,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(refreshDays),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByIp = clientIp
        };

        _dbContext.RefreshTokens.Add(newRefreshTokenEntity);
        await _dbContext.SaveChangesAsync(ct);

        return new AuthResponseDto
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Role = roles.FirstOrDefault() ?? "Resident",
            AccessToken = newAccessToken,
            RefreshToken = rawNewRefreshToken,
            ExpiresAtUtc = expiresAtUtc
        };
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken, string clientIp, CancellationToken ct = default)
    {
        var tokenHash = HashToken(refreshToken);
        var storedToken = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);

        if (storedToken == null || storedToken.IsRevoked)
        {
            return;
        }

        storedToken.RevokedAtUtc = DateTime.UtcNow;
        storedToken.RevokedByIp = clientIp;

        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task RevokeAllUserRefreshTokensAsync(Guid userId, string reason, string clientIp, CancellationToken ct = default)
    {
        var activeTokens = await _dbContext.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAtUtc == null && rt.ExpiresAtUtc > DateTime.UtcNow)
            .ToListAsync(ct);

        var utcNow = DateTime.UtcNow;
        foreach (var token in activeTokens)
        {
            token.RevokedAtUtc = utcNow;
            token.RevokedByIp = clientIp;
        }

        await _dbContext.SaveChangesAsync(ct);
    }

    private static string GenerateSecureRandomToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashBytes);
    }
}

