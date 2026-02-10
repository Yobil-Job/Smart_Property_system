using Microsoft.AspNetCore.Identity;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public ApplicationUser()
    {
        Id = Guid.NewGuid();
    }
}

