namespace SmartPropertyAI.Application.Features.AI;

public interface IIntentDetectionService
{
    Task<string> DetectIntentAsync(string userMessage, string role, CancellationToken ct = default);
}

