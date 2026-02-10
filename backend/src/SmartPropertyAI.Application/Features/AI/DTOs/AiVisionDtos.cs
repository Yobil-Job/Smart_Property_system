namespace SmartPropertyAI.Application.Features.AI.DTOs;

public class VisualDiagnosticRequestDto
{
    public string? ImageUrl { get; set; }
    public string? ImageBase64 { get; set; }
    public string? Description { get; set; }
    public string? RoomLocation { get; set; }
}

public class VisualDiagnosticResultDto
{
    public string DetectedIssue { get; set; } = string.Empty;
    public string Category { get; set; } = "Other";
    public string RecommendedPriority { get; set; } = "Medium";
    public string SafetyRiskAssessment { get; set; } = string.Empty;
    public List<string> ImmediateActionSteps { get; set; } = new();
    public List<string> RecommendedToolsAndParts { get; set; } = new();
    public double ConfidenceScore { get; set; } = 0.95;
    public string ImageUrl { get; set; } = string.Empty;
}

public class ImageUploadResponseDto
{
    public string FileUrl { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
}

