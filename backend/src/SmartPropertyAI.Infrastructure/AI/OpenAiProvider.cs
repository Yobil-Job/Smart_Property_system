using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.AI.DTOs;
using SmartPropertyAI.Domain.Exceptions;

namespace SmartPropertyAI.Infrastructure.AI;

public class OpenAiProvider : IAiProvider
{
    private readonly HttpClient _httpClient;
    private readonly OpenAiSettings _settings;
    private readonly ILogger<OpenAiProvider> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public string ProviderName => _settings.BaseUrl.Contains("groq.com", StringComparison.OrdinalIgnoreCase) ? "Groq" : "OpenAI";

    public OpenAiProvider(
        HttpClient httpClient,
        IOptions<OpenAiSettings> settings,
        ILogger<OpenAiProvider> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<AiChatResponse> GenerateChatCompletionAsync(AiChatRequest request, CancellationToken ct = default)
    {
        var apiKey = GetEffectiveApiKey();
        var baseUrl = GetEffectiveBaseUrl();
        var model = request.Model ?? GetEffectiveModel();

        var payload = new
        {
            model,
            messages = request.Messages.Select(m => new { role = m.Role, content = m.Content }).ToList(),
            temperature = request.Temperature ?? _settings.Temperature,
            max_tokens = request.MaxTokens ?? _settings.MaxTokens
        };

        var stopwatch = Stopwatch.StartNew();
        var jsonResponse = await SendWithRetryAsync(baseUrl, apiKey, payload, ct);
        stopwatch.Stop();

        using var doc = JsonDocument.Parse(jsonResponse);
        var root = doc.RootElement;

        var messageProp = root.GetProperty("choices")[0].GetProperty("message");
        var content = "";
        if (messageProp.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String)
        {
            content = c.GetString() ?? string.Empty;
        }
        if (string.IsNullOrWhiteSpace(content) && messageProp.TryGetProperty("reasoning_content", out var rc) && rc.ValueKind == JsonValueKind.String)
        {
            content = rc.GetString() ?? string.Empty;
        }
        if (string.IsNullOrWhiteSpace(content) && messageProp.TryGetProperty("reasoning", out var r) && r.ValueKind == JsonValueKind.String)
        {
            content = r.GetString() ?? string.Empty;
        }

        var finishReason = root
            .GetProperty("choices")[0]
            .GetProperty("finish_reason")
            .GetString() ?? "stop";

        var promptTokens = 0;
        var completionTokens = 0;
        if (root.TryGetProperty("usage", out var usageProp))
        {
            promptTokens = usageProp.GetProperty("prompt_tokens").GetInt32();
            completionTokens = usageProp.GetProperty("completion_tokens").GetInt32();
        }

        _logger.LogInformation("AI Completion generated. Model: {Model}, Latency: {Latency}ms, Tokens: {PromptTokens}+{CompletionTokens}={TotalTokens}",
            model, stopwatch.ElapsedMilliseconds, promptTokens, completionTokens, promptTokens + completionTokens);

        return new AiChatResponse
        {
            Content = content,
            FinishReason = finishReason,
            Model = model,
            LatencyMs = stopwatch.ElapsedMilliseconds,
            Usage = new AiUsage
            {
                PromptTokens = promptTokens,
                CompletionTokens = completionTokens
            }
        };
    }

    public async Task<TResponse> GenerateStructuredOutputAsync<TResponse>(AiStructuredRequest request, CancellationToken ct = default)
    {
        var messages = new List<AiChatMessage>
        {
            AiChatMessage.System(request.SystemPrompt + "\nYou MUST return valid JSON only. Do not wrap in markdown tags.")
        };

        if (!string.IsNullOrWhiteSpace(request.ResponseSchemaJson))
        {
            messages.Add(AiChatMessage.System($"Expected JSON Schema: {request.ResponseSchemaJson}"));
        }

        messages.Add(AiChatMessage.User(request.UserPrompt));

        var chatRequest = new AiChatRequest
        {
            Messages = messages,
            Model = request.Model,
            Temperature = request.Temperature ?? 0.1
        };

        var chatResponse = await GenerateChatCompletionAsync(chatRequest, ct);

        try
        {
            var rawJson = CleanJsonOutput(chatResponse.Content);
            var result = JsonSerializer.Deserialize<TResponse>(rawJson, JsonOptions);
            if (result == null)
            {
                throw new AiProviderException("Failed to deserialize structured AI output.", HttpStatusCode.BadGateway);
            }
            return result;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse structured output from AI response: {Content}", chatResponse.Content);
            throw new AiProviderException("AI response could not be parsed as valid structured JSON.", ex, HttpStatusCode.BadGateway);
        }
    }

    public async Task<AiToolCallResponse> GenerateToolSelectionAsync(AiToolSelectionRequest request, CancellationToken ct = default)
    {
        var apiKey = GetEffectiveApiKey();
        var baseUrl = GetEffectiveBaseUrl();
        var model = request.Model ?? GetEffectiveModel();

        var toolsFormatted = request.Tools.Select(t => new
        {
            type = "function",
            function = new
            {
                name = t.Name,
                description = t.Description,
                parameters = t.ParametersSchema
            }
        }).ToList();

        var payload = new
        {
            model,
            messages = request.Messages.Select(m => new { role = m.Role, content = m.Content }).ToList(),
            tools = toolsFormatted,
            tool_choice = "auto",
            temperature = request.Temperature ?? _settings.Temperature
        };

        var stopwatch = Stopwatch.StartNew();
        var jsonResponse = await SendWithRetryAsync(baseUrl, apiKey, payload, ct);
        stopwatch.Stop();

        using var doc = JsonDocument.Parse(jsonResponse);
        var root = doc.RootElement;
        var choice = root.GetProperty("choices")[0].GetProperty("message");

        var response = new AiToolCallResponse
        {
            LatencyMs = stopwatch.ElapsedMilliseconds
        };

        if (choice.TryGetProperty("content", out var contentProp) && contentProp.ValueKind == JsonValueKind.String)
        {
            response.AssistantMessage = contentProp.GetString();
        }

        if (choice.TryGetProperty("tool_calls", out var toolCallsProp) && toolCallsProp.ValueKind == JsonValueKind.Array)
        {
            foreach (var call in toolCallsProp.EnumerateArray())
            {
                var function = call.GetProperty("function");
                response.ToolCalls.Add(new AiToolCall
                {
                    Id = call.GetProperty("id").GetString() ?? string.Empty,
                    ToolName = function.GetProperty("name").GetString() ?? string.Empty,
                    FunctionArgumentsJson = function.GetProperty("arguments").GetString() ?? "{}"
                });
            }
        }

        if (root.TryGetProperty("usage", out var usageProp))
        {
            response.Usage = new AiUsage
            {
                PromptTokens = usageProp.GetProperty("prompt_tokens").GetInt32(),
                CompletionTokens = usageProp.GetProperty("completion_tokens").GetInt32()
            };
        }

        return response;
    }

    public async Task<AiPingResponse> PingAsync(string? modelOverride = null, CancellationToken ct = default)
    {
        var model = modelOverride ?? GetEffectiveModel();
        var apiKey = GetEffectiveApiKey();
        var baseUrl = GetEffectiveBaseUrl();

        var payload = new
        {
            model,
            messages = new[]
            {
                new { role = "user", content = "Respond with 'PONG'" }
            },
            max_tokens = 100,
            temperature = 0.0
        };

        var stopwatch = Stopwatch.StartNew();
        var jsonResponse = await SendWithRetryAsync(baseUrl, apiKey, payload, ct);
        stopwatch.Stop();

        using var doc = JsonDocument.Parse(jsonResponse);
        var root = doc.RootElement;

        var messageProp = root.GetProperty("choices")[0].GetProperty("message");
        var content = "";
        if (messageProp.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String)
        {
            content = c.GetString() ?? string.Empty;
        }
        if (string.IsNullOrWhiteSpace(content) && messageProp.TryGetProperty("reasoning_content", out var rc) && rc.ValueKind == JsonValueKind.String)
        {
            content = rc.GetString() ?? string.Empty;
        }
        if (string.IsNullOrWhiteSpace(content) && messageProp.TryGetProperty("reasoning", out var r) && r.ValueKind == JsonValueKind.String)
        {
            content = r.GetString() ?? string.Empty;
        }

        var promptTokens = 0;
        var completionTokens = 0;
        if (root.TryGetProperty("usage", out var usageProp))
        {
            promptTokens = usageProp.GetProperty("prompt_tokens").GetInt32();
            completionTokens = usageProp.GetProperty("completion_tokens").GetInt32();
        }

        return new AiPingResponse
        {
            Provider = ProviderName,
            Model = model,
            Status = "Healthy",
            LatencyMs = stopwatch.ElapsedMilliseconds,
            PromptTokens = promptTokens,
            CompletionTokens = completionTokens,
            Echo = content.Trim()
        };
    }

    private async Task<string> SendWithRetryAsync(string baseUrl, string apiKey, object payload, CancellationToken ct)
    {
        const int maxRetries = 2;
        var delayMs = 1000;

        var endpoint = baseUrl.TrimEnd('/') + "/chat/completions";
        var jsonPayload = JsonSerializer.Serialize(payload);

        for (var attempt = 1; attempt <= maxRetries + 1; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(_settings.TimeoutSeconds));
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

                var response = await _httpClient.SendAsync(request, linkedCts.Token);

                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadAsStringAsync(linkedCts.Token);
                }

                var errorBody = await response.Content.ReadAsStringAsync(linkedCts.Token);

                if ((response.StatusCode == HttpStatusCode.TooManyRequests || (int)response.StatusCode == 503) && attempt <= maxRetries)
                {
                    _logger.LogWarning("AI Provider returned HTTP {StatusCode}. Retrying attempt {Attempt} in {Delay}ms...", response.StatusCode, attempt, delayMs);
                    await Task.Delay(delayMs, ct);
                    delayMs *= 2;
                    continue;
                }

                if (response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Forbidden)
                {
                    throw new AiProviderException("AI Provider authentication failed. Please check your API key.", HttpStatusCode.BadGateway);
                }

                throw new AiProviderException($"AI Provider error (HTTP {(int)response.StatusCode}): {errorBody}", HttpStatusCode.BadGateway);
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                throw new AiProviderException($"AI Provider request timed out after {_settings.TimeoutSeconds} seconds.", HttpStatusCode.GatewayTimeout);
            }
            catch (HttpRequestException ex)
            {
                if (attempt <= maxRetries)
                {
                    _logger.LogWarning(ex, "Network error communicating with AI provider. Retrying attempt {Attempt}...", attempt);
                    await Task.Delay(delayMs, ct);
                    delayMs *= 2;
                    continue;
                }
                throw new AiProviderException("Network failure communicating with AI Provider.", ex, HttpStatusCode.BadGateway);
            }
        }

        throw new AiProviderException("AI Provider request failed after retries.", HttpStatusCode.BadGateway);
    }

    private string GetEffectiveApiKey()
    {
        var key = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
        if (string.IsNullOrWhiteSpace(key))
        {
            key = Environment.GetEnvironmentVariable("GROQ_API_KEY");
        }
        if (string.IsNullOrWhiteSpace(key))
        {
            key = _settings.ApiKey;
        }

        if (string.IsNullOrWhiteSpace(key))
        {
            throw new AiProviderException("AI API Key is not configured. Set OPENAI_API_KEY in .env, environment variables, or appsettings.json.", HttpStatusCode.BadGateway);
        }

        return key.Trim();
    }

    private string GetEffectiveBaseUrl()
    {
        var url = Environment.GetEnvironmentVariable("OPENAI_BASE_URL");
        if (!string.IsNullOrWhiteSpace(url)) return url.Trim();
        return string.IsNullOrWhiteSpace(_settings.BaseUrl) ? "https://api.openai.com/v1" : _settings.BaseUrl.Trim();
    }

    private string GetEffectiveModel()
    {
        var model = Environment.GetEnvironmentVariable("OPENAI_MODEL");
        if (!string.IsNullOrWhiteSpace(model)) return model.Trim();
        return string.IsNullOrWhiteSpace(_settings.Model) ? "gpt-4o-mini" : _settings.Model.Trim();
    }

    private static string CleanJsonOutput(string content)
    {
        var trimmed = content.Trim();
        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = trimmed[7..];
        }
        else if (trimmed.StartsWith("```"))
        {
            trimmed = trimmed[3..];
        }

        if (trimmed.EndsWith("```"))
        {
            trimmed = trimmed[..^3];
        }

        return trimmed.Trim();
    }
}

