using SmartPropertyAI.Domain.Common;

namespace SmartPropertyAI.Domain.Entities;

public class RefreshToken : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public string JwtId { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAtUtc { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public string CreatedByIp { get; set; } = string.Empty;
    public string? RevokedByIp { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAtUtc;
    public bool IsRevoked => RevokedAtUtc != null;
    public bool IsActive => !IsRevoked && !IsExpired;

    public RefreshToken()
    {
        Id = Guid.NewGuid();
    }
}

