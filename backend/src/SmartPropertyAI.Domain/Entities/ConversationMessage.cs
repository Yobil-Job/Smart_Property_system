using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class ConversationMessage : BaseEntity
{
    public Guid ConversationId { get; set; }
    public SenderType SenderType { get; set; } = SenderType.User;
    public string Content { get; set; } = string.Empty;
    public string? MetadataJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Conversation Conversation { get; set; } = null!;
}

