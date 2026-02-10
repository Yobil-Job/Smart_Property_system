using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class MaintenanceHistoryConfiguration : IEntityTypeConfiguration<MaintenanceHistory>
{
    public void Configure(EntityTypeBuilder<MaintenanceHistory> builder)
    {
        builder.HasKey(h => h.Id);

        builder.Property(h => h.PreviousStatus)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(h => h.NewStatus)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(h => h.ChangeReason)
            .HasMaxLength(500);

        builder.Property(h => h.ChangedByName)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(h => h.MaintenanceRequestId);
    }
}

