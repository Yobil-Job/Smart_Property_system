using SmartPropertyAI.Application.Features.AI.DTOs;

namespace SmartPropertyAI.Application.Features.AI;

public interface IVisualDiagnosticsService
{
    Task<VisualDiagnosticResultDto> DiagnoseIssueAsync(VisualDiagnosticRequestDto request, CancellationToken ct = default);
}

