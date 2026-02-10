using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class Conversation : BaseEntity, ISoftDeletable
{
    public Guid UserId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public ConversationStatus Status { get; set; } = ConversationStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }

    public ICollection<ConversationMessage> Messages { get; set; } = new List<ConversationMessage>();
    public ConversationWorkflow? CurrentWorkflow { get; set; }
}
