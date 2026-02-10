using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.Persistence.Configurations;

public class ConversationWorkflowConfiguration : IEntityTypeConfiguration<ConversationWorkflow>
{
    public void Configure(EntityTypeBuilder<ConversationWorkflow> builder)
    {
        builder.HasKey(w => w.Id);

        builder.Property(w => w.Intent)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(w => w.WorkflowType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(w => w.CollectedFieldsJson)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(w => w.MissingFieldsJson)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(w => w.PendingActionJson)
            .HasMaxLength(4000);

        builder.Property(w => w.ConfirmationStatus)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.HasOne(w => w.Conversation)
            .WithOne(c => c.CurrentWorkflow)
            .HasForeignKey<ConversationWorkflow>(w => w.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(w => w.ConversationId)
            .IsUnique();
    }
}
