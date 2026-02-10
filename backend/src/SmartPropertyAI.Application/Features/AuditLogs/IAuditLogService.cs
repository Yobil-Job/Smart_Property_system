using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.AuditLogs.DTOs;

namespace SmartPropertyAI.Application.Features.AuditLogs;

public interface IAuditLogService
{
    Task<PagedResult<AuditLogSummaryDto>> GetAuditLogsAsync(AuditLogFilterDto filter, CancellationToken ct = default);
    Task<AuditLogDetailDto> GetAuditLogByIdAsync(Guid id, CancellationToken ct = default);
    Task LogActionAsync(string action, string entityType, string entityId, object? previousValues = null, object? newValues = null, CancellationToken ct = default);
}

