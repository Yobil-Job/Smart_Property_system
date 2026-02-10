using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class MaintenanceRequestConfiguration : IEntityTypeConfiguration<MaintenanceRequest>
{
    public void Configure(EntityTypeBuilder<MaintenanceRequest> builder)
    {
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(m => m.Description)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(m => m.Category)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(m => m.Priority)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(m => m.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(m => m.ImageUrl)
            .HasMaxLength(1000);

        builder.HasOne(m => m.Resident)
            .WithMany()
            .HasForeignKey(m => m.ResidentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Apartment)
            .WithMany()
            .HasForeignKey(m => m.ApartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.AssignedStaff)
            .WithMany()
            .HasForeignKey(m => m.AssignedStaffId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(m => m.Notes)
            .WithOne(n => n.MaintenanceRequest)
            .HasForeignKey(n => n.MaintenanceRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(m => m.History)
            .WithOne(h => h.MaintenanceRequest)
            .HasForeignKey(h => h.MaintenanceRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(m => m.Status);
        builder.HasIndex(m => m.Priority);
        builder.HasIndex(m => m.Category);
        builder.HasIndex(m => m.ResidentId);
        builder.HasIndex(m => m.ApartmentId);
        builder.HasIndex(m => m.AssignedStaffId);
    }
}

