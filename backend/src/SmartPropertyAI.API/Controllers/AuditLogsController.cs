using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.AuditLogs;
using SmartPropertyAI.Application.Features.AuditLogs.DTOs;

namespace SmartPropertyAI.API.Controllers;

[Authorize(Policy = "RequireAdminRole")]
[Route("api/v1/audit-logs")]
public class AuditLogsController : BaseApiController
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<AuditLogSummaryDto>>>> GetAuditLogs(
        [FromQuery] AuditLogFilterDto filter,
        CancellationToken ct)
    {
        var result = await _auditLogService.GetAuditLogsAsync(filter, ct);
        return OkResponse(result, "Audit logs retrieved successfully.");
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<AuditLogDetailDto>>> GetAuditLog(Guid id, CancellationToken ct)
    {
        var result = await _auditLogService.GetAuditLogByIdAsync(id, ct);
        return OkResponse(result, "Audit log details retrieved successfully.");
    }
}
