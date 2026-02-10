using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class PropertyConfiguration : IEntityTypeConfiguration<Property>
{
    public void Configure(EntityTypeBuilder<Property> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(p => p.Address)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(p => p.City)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.Country)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.Description)
            .HasMaxLength(1000);

        builder.Property(p => p.PropertyType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.HasMany(p => p.Buildings)
            .WithOne(b => b.Property)
            .HasForeignKey(b => b.PropertyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(p => p.StaffMembers)
            .WithOne(s => s.Property)
            .HasForeignKey(s => s.PropertyId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

