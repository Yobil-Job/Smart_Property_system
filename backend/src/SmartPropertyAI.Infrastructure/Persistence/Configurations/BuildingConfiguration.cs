using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class BuildingConfiguration : IEntityTypeConfiguration<Building>
{
    public void Configure(EntityTypeBuilder<Building> builder)
    {
        builder.HasKey(b => b.Id);

        builder.Property(b => b.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(b => b.Description)
            .HasMaxLength(1000);

        builder.Property(b => b.FloorCount)
            .IsRequired();

        builder.HasIndex(b => new { b.PropertyId, b.Name })
            .IsUnique();

        builder.HasMany(b => b.Apartments)
            .WithOne(a => a.Building)
            .HasForeignKey(a => a.BuildingId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

