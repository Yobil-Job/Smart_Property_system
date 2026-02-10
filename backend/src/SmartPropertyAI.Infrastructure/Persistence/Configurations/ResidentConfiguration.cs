using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Infrastructure.Identity;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class ResidentConfiguration : IEntityTypeConfiguration<Resident>
{
    public void Configure(EntityTypeBuilder<Resident> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.FullName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(r => r.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(r => r.PhoneNumber)
            .HasMaxLength(50);

        builder.Property(r => r.EmergencyContact)
            .HasMaxLength(500);

        builder.Property(r => r.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.HasOne(r => r.Apartment)
            .WithMany(a => a.Residents)
            .HasForeignKey(r => r.ApartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(r => r.UserId);
    }
}

