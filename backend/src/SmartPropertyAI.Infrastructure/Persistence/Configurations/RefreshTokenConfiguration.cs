using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Infrastructure.Identity;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TokenHash)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(x => x.TokenHash);

        builder.Property(x => x.JwtId)
            .HasMaxLength(128);

        builder.Property(x => x.CreatedByIp)
            .HasMaxLength(50);

        builder.Property(x => x.RevokedByIp)
            .HasMaxLength(50);

        builder.HasOne<ApplicationUser>()
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

