using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class MaintenanceNoteConfiguration : IEntityTypeConfiguration<MaintenanceNote>
{
    public void Configure(EntityTypeBuilder<MaintenanceNote> builder)
    {
        builder.HasKey(n => n.Id);

        builder.Property(n => n.NoteText)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(n => n.AuthorName)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(n => n.MaintenanceRequestId);
    }
}

