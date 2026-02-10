using System.Text.RegularExpressions;
using SmartPropertyAI.Application.Features.AI;

namespace SmartPropertyAI.Infrastructure.AI;

public class PromptTemplateManager : IPromptTemplateManager
{
    private readonly string _templatesDirectory;
    private readonly Dictionary<string, string> _cachedTemplates = new(StringComparer.OrdinalIgnoreCase);

    public PromptTemplateManager()
    {
        var baseDir = AppContext.BaseDirectory;
        // Search in local output directory or source directory
        var possiblePaths = new[]
        {
            Path.Combine(baseDir, "AI", "Templates"),
            Path.Combine(baseDir, "Templates"),
            Path.Combine(baseDir, "..", "..", "..", "..", "src", "SmartPropertyAI.Infrastructure", "AI", "Templates"),
            Path.Combine(baseDir, "..", "..", "..", "..", "..", "src", "SmartPropertyAI.Infrastructure", "AI", "Templates"),
            Path.Combine(Directory.GetCurrentDirectory(), "AI", "Templates"),
            Path.Combine(Directory.GetCurrentDirectory(), "src", "SmartPropertyAI.Infrastructure", "AI", "Templates")
        };

        _templatesDirectory = possiblePaths.FirstOrDefault(Directory.Exists) ?? Path.Combine(baseDir, "Templates");
    }

    public string GetTemplate(string templateName)
    {
        var cleanName = templateName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase) ? templateName : $"{templateName}.txt";

        if (_cachedTemplates.TryGetValue(cleanName, out var cached))
        {
            return cached;
        }

        var filePath = Path.Combine(_templatesDirectory, cleanName);
        if (File.Exists(filePath))
        {
            var content = File.ReadAllText(filePath);
            _cachedTemplates[cleanName] = content;
            return content;
        }

        // Fallback default templates
        return cleanName switch
        {
            var n when n.Contains("Resident", StringComparison.OrdinalIgnoreCase) =>
                "You are the SmartProperty AI Resident Assistant. Assist residents with maintenance reporting and visitor pre-registration.",
            var n when n.Contains("Staff", StringComparison.OrdinalIgnoreCase) =>
                "You are the SmartProperty AI Staff Operations Assistant. Help on-site staff manage assigned tasks.",
            var n when n.Contains("Admin", StringComparison.OrdinalIgnoreCase) =>
                "You are the SmartProperty AI Administrator Executive Assistant. Provide high-level operational oversight.",
            var n when n.Contains("Intent", StringComparison.OrdinalIgnoreCase) =>
                "You are a precise Natural Language Understanding and Intent Extraction Engine for SmartProperty AI.",
            _ => "You are an intelligent property management assistant for SmartProperty AI."
        };
    }

    public string RenderTemplate(string templateName, IDictionary<string, string> parameters)
    {
        var template = GetTemplate(templateName);
        foreach (var (key, value) in parameters)
        {
            template = template.Replace($"{{{{{key}}}}}", value);
        }
        return template;
    }
}
