using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class AmenityConfiguration : IEntityTypeConfiguration<Amenity>
{
    public void Configure(EntityTypeBuilder<Amenity> builder)
    {
        builder.ToTable("amenities");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(a => a.Description)
            .HasMaxLength(1000);

        builder.Property(a => a.ImageUrl)
            .HasMaxLength(500);

        builder.Property(a => a.RulesSummary)
            .HasMaxLength(1000);

        builder.HasOne(a => a.Property)
            .WithMany()
            .HasForeignKey(a => a.PropertyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class AmenityBookingConfiguration : IEntityTypeConfiguration<AmenityBooking>
{
    public void Configure(EntityTypeBuilder<AmenityBooking> builder)
    {
        builder.ToTable("amenity_bookings");
        builder.HasKey(b => b.Id);

        builder.Property(b => b.Purpose)
            .HasMaxLength(200);

        builder.Property(b => b.Notes)
            .HasMaxLength(500);

        builder.HasOne(b => b.Amenity)
            .WithMany(a => a.Bookings)
            .HasForeignKey(b => b.AmenityId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(b => b.Resident)
            .WithMany()
            .HasForeignKey(b => b.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

