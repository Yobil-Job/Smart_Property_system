using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.AI.DTOs;

namespace SmartPropertyAI.API.Controllers;

[Authorize(Policy = "RequireAdminRole")]
[Route("api/v1/ai/diagnostics")]
public class AiDiagnosticsController : BaseApiController
{
    private readonly IAiProvider _aiProvider;

    public AiDiagnosticsController(IAiProvider aiProvider)
    {
        _aiProvider = aiProvider;
    }

    [HttpPost("ping")]
    public async Task<ActionResult<ApiResponse<AiPingResponse>>> Ping(
        [FromBody] AiPingRequest? request,
        CancellationToken ct)
    {
        var modelOverride = request?.ModelOverride;
        var result = await _aiProvider.PingAsync(modelOverride, ct);
        return OkResponse(result, "AI Provider operational");
    }
}

