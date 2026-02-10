using SmartPropertyAI.Application.Features.Conversations.DTOs;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Application.Features.AI;

public class FormProcessingResult
{
    public bool IsComplete { get; set; }
    public string ReplyMessage { get; set; } = string.Empty;
    public string CollectedFieldsJson { get; set; } = "{}";
    public string MissingFieldsJson { get; set; } = "[]";
    public PendingActionDto? PendingAction { get; set; }
}

public interface IConversationalFormService
{
    Task<FormProcessingResult> ProcessFormTurnAsync(
        ConversationWorkflow workflow,
        string userMessage,
        string role,
        CancellationToken ct = default);
}

