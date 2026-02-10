using SmartPropertyAI.Application.Features.AI.DTOs;

namespace SmartPropertyAI.Application.Features.AI;

public interface IAiProvider
{
    string ProviderName { get; }
    Task<AiChatResponse> GenerateChatCompletionAsync(AiChatRequest request, CancellationToken ct = default);
    Task<TResponse> GenerateStructuredOutputAsync<TResponse>(AiStructuredRequest request, CancellationToken ct = default);
    Task<AiToolCallResponse> GenerateToolSelectionAsync(AiToolSelectionRequest request, CancellationToken ct = default);
    Task<AiPingResponse> PingAsync(string? modelOverride = null, CancellationToken ct = default);
}

