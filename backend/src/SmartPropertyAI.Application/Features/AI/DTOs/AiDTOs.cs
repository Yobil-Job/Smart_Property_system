namespace SmartPropertyAI.Application.Features.AI.DTOs;

public class AiChatMessage
{
    public string Role { get; set; } = "user"; // system, user, assistant, tool
    public string Content { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? ToolCallId { get; set; }

    public static AiChatMessage System(string content) => new() { Role = "system", Content = content };
    public static AiChatMessage User(string content) => new() { Role = "user", Content = content };
    public static AiChatMessage Assistant(string content) => new() { Role = "assistant", Content = content };
    public static AiChatMessage Tool(string toolCallId, string content) => new() { Role = "tool", ToolCallId = toolCallId, Content = content };
}

public class AiUsage
{
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public int TotalTokens => PromptTokens + CompletionTokens;
}

public class AiChatRequest
{
    public List<AiChatMessage> Messages { get; set; } = new();
    public string? Model { get; set; }
    public double? Temperature { get; set; }
    public int? MaxTokens { get; set; }
}

public class AiChatResponse
{
    public string Content { get; set; } = string.Empty;
    public string FinishReason { get; set; } = "stop";
    public AiUsage Usage { get; set; } = new();
    public string Model { get; set; } = string.Empty;
    public long LatencyMs { get; set; }
}

public class AiToolDefinition
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public object ParametersSchema { get; set; } = new();
    public string JsonParametersSchema { get; set; } = "{}";
}

public class AiToolCall
{
    public string Id { get; set; } = string.Empty;
    public string ToolName { get; set; } = string.Empty;
    public string FunctionArgumentsJson { get; set; } = "{}";
}

public class AiToolSelectionRequest
{
    public List<AiChatMessage> Messages { get; set; } = new();
    public List<AiToolDefinition> Tools { get; set; } = new();
    public string? Model { get; set; }
    public double? Temperature { get; set; }
}

public class AiToolCallResponse
{
    public bool HasToolCall => ToolCalls.Count > 0;
    public List<AiToolCall> ToolCalls { get; set; } = new();
    public string? AssistantMessage { get; set; }
    public AiUsage Usage { get; set; } = new();
    public long LatencyMs { get; set; }
}

public class AiStructuredRequest
{
    public string SystemPrompt { get; set; } = string.Empty;
    public string UserPrompt { get; set; } = string.Empty;
    public string? ResponseSchemaJson { get; set; }
    public string? Model { get; set; }
    public double? Temperature { get; set; }
}

public class AiPingRequest
{
    public string? ModelOverride { get; set; }
}

public class AiPingResponse
{
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Status { get; set; } = "Healthy";
    public long LatencyMs { get; set; }
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public string Echo { get; set; } = string.Empty;
}

