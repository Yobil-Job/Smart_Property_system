using SmartPropertyAI.Domain.Common;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Domain.Entities;

public class ConversationWorkflow : BaseEntity
{
    public Guid ConversationId { get; set; }
    public string Intent { get; set; } = string.Empty;
    public string WorkflowType { get; set; } = string.Empty;
    public string CollectedFieldsJson { get; set; } = "{}";
    public string MissingFieldsJson { get; set; } = "[]";
    public string? PendingActionJson { get; set; }
    public ConfirmationStatus ConfirmationStatus { get; set; } = ConfirmationStatus.None;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Conversation Conversation { get; set; } = null!;
}

