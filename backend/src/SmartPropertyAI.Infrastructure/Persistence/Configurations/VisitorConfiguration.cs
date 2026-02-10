using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class VisitorConfiguration : IEntityTypeConfiguration<Visitor>
{
    public void Configure(EntityTypeBuilder<Visitor> builder)
    {
        builder.HasKey(v => v.Id);

        builder.Property(v => v.VisitorName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(v => v.VisitorPhone)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(v => v.Purpose)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(v => v.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.HasOne(v => v.Resident)
            .WithMany()
            .HasForeignKey(v => v.ResidentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(v => v.ResidentId);
        builder.HasIndex(v => v.Status);
        builder.HasIndex(v => v.ExpectedArrival);
    }
}

