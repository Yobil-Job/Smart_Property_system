namespace SmartPropertyAI.Infrastructure.AI;

public class OpenAiSettings
{
    public const string SectionName = "OpenAISettings";

    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
    public string Model { get; set; } = "gpt-4o-mini";
    public int MaxTokens { get; set; } = 1000;
    public double Temperature { get; set; } = 0.2;
    public int TimeoutSeconds { get; set; } = 25;
}

