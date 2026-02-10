namespace SmartPropertyAI.Application.Features.AI;

public interface IPromptTemplateManager
{
    string GetTemplate(string templateName);
    string RenderTemplate(string templateName, IDictionary<string, string> parameters);
}

