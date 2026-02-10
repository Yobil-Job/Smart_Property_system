using SmartPropertyAI.Application.Features.AI.DTOs;

namespace SmartPropertyAI.Application.Features.AI;

public interface IAiToolRegistry
{
    IReadOnlyList<AiToolDefinition> GetToolsForRole(string role);
    AiToolDefinition? GetTool(string toolName, string role);
}

