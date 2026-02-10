using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Infrastructure.Identity;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class StaffConfiguration : IEntityTypeConfiguration<Staff>
{
    public void Configure(EntityTypeBuilder<Staff> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.EmployeeNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(s => s.EmployeeNumber)
            .IsUnique();

        builder.Property(s => s.Position)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(s => s.EmploymentStatus)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.HasOne(s => s.Property)
            .WithMany(p => p.StaffMembers)
            .HasForeignKey(s => s.PropertyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => s.UserId);
    }
}

