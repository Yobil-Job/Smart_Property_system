using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class ApartmentConfiguration : IEntityTypeConfiguration<Apartment>
{
    public void Configure(EntityTypeBuilder<Apartment> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.ApartmentNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(a => a.Floor)
            .IsRequired();

        builder.Property(a => a.NumberOfBedrooms)
            .IsRequired();

        builder.Property(a => a.NumberOfBathrooms)
            .IsRequired();

        builder.Property(a => a.OccupancyStatus)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(a => new { a.BuildingId, a.ApartmentNumber })
            .IsUnique();

        builder.HasMany(a => a.Residents)
            .WithOne(r => r.Apartment)
            .HasForeignKey(r => r.ApartmentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

