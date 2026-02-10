using System.Text.Json.Serialization;

namespace SmartPropertyAI.Application.Features.Conversations.DTOs;

public class AiChatRequestDto
{
    public Guid? ConversationId { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class AiChatResponseDto
{
    public Guid ConversationId { get; set; }
    public string ReplyMessage { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool RequiresConfirmation { get; set; }
    public PendingActionDto? PendingAction { get; set; }
}

public class PendingActionDto
{
    public string ActionType { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public Dictionary<string, object?> Parameters { get; set; } = new();
}

public class CreateConversationRequestDto
{
    public string? Title { get; set; }
}

public class ConversationSummaryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int MessageCount { get; set; }
}

public class ConversationDetailDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ConversationWorkflowDto? CurrentWorkflow { get; set; }
    public List<ConversationMessageDto> Messages { get; set; } = new();
}

public class ConversationWorkflowDto
{
    public Guid Id { get; set; }
    public string Intent { get; set; } = string.Empty;
    public string WorkflowType { get; set; } = string.Empty;
    public string CollectedFieldsJson { get; set; } = "{}";
    public string MissingFieldsJson { get; set; } = "[]";
    public string? PendingActionJson { get; set; }
    public PendingActionDto? PendingAction { get; set; }
    public string ConfirmationStatus { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public class ConversationMessageDto
{
    public Guid Id { get; set; }
    public string SenderType { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? MetadataJson { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ConfirmActionRequestDto
{
    public bool Confirmed { get; set; } = true;
}

public class ConfirmActionResponseDto
{
    public string ActionExecuted { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string TicketNumber { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class CancelActionRequestDto
{
    public string? Reason { get; set; }
}

