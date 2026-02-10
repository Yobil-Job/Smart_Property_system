using System.Diagnostics;
using System.Text.Json;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.AI.DTOs;

namespace SmartPropertyAI.Infrastructure.AI;

public class MockAiProvider : IAiProvider
{
    public string ProviderName => "Mock";

    public Func<AiChatRequest, AiChatResponse>? CustomChatHandler { get; set; }
    public Func<AiToolSelectionRequest, AiToolCallResponse>? CustomToolHandler { get; set; }

    public Task<AiChatResponse> GenerateChatCompletionAsync(AiChatRequest request, CancellationToken ct = default)
    {
        if (CustomChatHandler != null)
        {
            return Task.FromResult(CustomChatHandler(request));
        }

        var lastMessage = request.Messages.LastOrDefault()?.Content ?? string.Empty;
        var responseContent = lastMessage.Contains("PONG", StringComparison.OrdinalIgnoreCase)
            ? "PONG"
            : $"[Mock AI]: Processed request for '{lastMessage}'.";

        return Task.FromResult(new AiChatResponse
        {
            Content = responseContent,
            FinishReason = "stop",
            Model = request.Model ?? "mock-model",
            LatencyMs = 15,
            Usage = new AiUsage
            {
                PromptTokens = 10,
                CompletionTokens = 5
            }
        });
    }

    public Task<TResponse> GenerateStructuredOutputAsync<TResponse>(AiStructuredRequest request, CancellationToken ct = default)
    {
        // Try to generate default instance of TResponse
        var type = typeof(TResponse);
        if (type == typeof(string))
        {
            return Task.FromResult((TResponse)(object)"Mock structured response");
        }

        try
        {
            var instance = Activator.CreateInstance<TResponse>();
            return Task.FromResult(instance);
        }
        catch
        {
            var json = "{}";
            var result = JsonSerializer.Deserialize<TResponse>(json)!;
            return Task.FromResult(result);
        }
    }

    public Task<AiToolCallResponse> GenerateToolSelectionAsync(AiToolSelectionRequest request, CancellationToken ct = default)
    {
        if (CustomToolHandler != null)
        {
            return Task.FromResult(CustomToolHandler(request));
        }

        var firstTool = request.Tools.FirstOrDefault();
        var response = new AiToolCallResponse
        {
            LatencyMs = 20,
            Usage = new AiUsage { PromptTokens = 15, CompletionTokens = 8 }
        };

        if (firstTool != null)
        {
            response.ToolCalls.Add(new AiToolCall
            {
                Id = $"call_{Guid.NewGuid():N}"[..12],
                ToolName = firstTool.Name,
                FunctionArgumentsJson = "{}"
            });
        }
        else
        {
            response.AssistantMessage = "I am ready to help you with property management tasks.";
        }

        return Task.FromResult(response);
    }

    public Task<AiPingResponse> PingAsync(string? modelOverride = null, CancellationToken ct = default)
    {
        return Task.FromResult(new AiPingResponse
        {
            Provider = "Mock",
            Model = modelOverride ?? "mock-ai-model",
            Status = "Healthy",
            LatencyMs = 12,
            PromptTokens = 5,
            CompletionTokens = 1,
            Echo = "PONG"
        });
    }
}

