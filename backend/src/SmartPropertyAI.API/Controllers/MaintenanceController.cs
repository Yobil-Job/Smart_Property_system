using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.AI.DTOs;
using SmartPropertyAI.Application.Features.Maintenance;
using SmartPropertyAI.Application.Features.Maintenance.DTOs;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Exceptions;

namespace SmartPropertyAI.API.Controllers;

[Authorize]
public class MaintenanceController : BaseApiController
{
    private readonly IMaintenanceService _maintenanceService;
    private readonly IVisualDiagnosticsService _visualDiagnosticsService;
    private readonly IWebHostEnvironment _environment;

    public MaintenanceController(
        IMaintenanceService maintenanceService,
        IVisualDiagnosticsService visualDiagnosticsService,
        IWebHostEnvironment environment)
    {
        _maintenanceService = maintenanceService;
        _visualDiagnosticsService = visualDiagnosticsService;
        _environment = environment;
    }

    [HttpPost("diagnose")]
    public async Task<ActionResult<ApiResponse<VisualDiagnosticResultDto>>> DiagnoseIssue(
        [FromBody] VisualDiagnosticRequestDto request,
        CancellationToken ct)
    {
        var result = await _visualDiagnosticsService.DiagnoseIssueAsync(request, ct);
        return OkResponse(result, "Visual maintenance diagnostics completed.");
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<ImageUploadResponseDto>>> UploadPhoto(
        IFormFile file,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
        {
            throw new ValidationException("No image file provided.");
        }

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(ext))
        {
            throw new ValidationException("Invalid image format. Supported formats: JPG, PNG, WEBP.");
        }

        var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadsFolder = Path.Combine(webRoot, "uploads", "maintenance");
        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, ct);
        }

        var relativeUrl = $"/uploads/maintenance/{uniqueFileName}";
        return OkResponse(new ImageUploadResponseDto
        {
            FileUrl = relativeUrl,
            FileName = file.FileName,
            FileSizeBytes = file.Length
        }, "Photo uploaded successfully.");
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<MaintenanceRequestDetailDto>>> CreateRequest(
        [FromBody] CreateMaintenanceRequest request,
        CancellationToken ct)
    {
        var result = await _maintenanceService.CreateRequestAsync(request, ct);
        return CreatedResponse(nameof(GetRequest), new { id = result.Id }, result, "Maintenance request created successfully.");
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<MaintenanceRequestSummaryDto>>>> GetRequests(
        [FromQuery] MaintenanceFilterDto filter,
        CancellationToken ct)
    {
        if (User.IsInRole(UserRoles.Resident) && !User.IsInRole(UserRoles.Administrator) && !User.IsInRole(UserRoles.Staff))
        {
            var myRequests = await _maintenanceService.GetMyRequestsAsync(filter.PageNumber, filter.PageSize, filter.Status, ct);
            return OkResponse(myRequests, "Resident maintenance requests retrieved successfully.");
        }

        var result = await _maintenanceService.GetRequestsAsync(filter, ct);
        return OkResponse(result, "Maintenance requests retrieved successfully.");
    }

    [HttpGet("my-requests")]
    [Authorize(Policy = "RequireResidentRole")]
    public async Task<ActionResult<ApiResponse<PagedResult<MaintenanceRequestSummaryDto>>>> GetMyRequests(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null,
        CancellationToken ct = default)
    {
        var result = await _maintenanceService.GetMyRequestsAsync(pageNumber, pageSize, status, ct);
        return OkResponse(result, "Resident maintenance requests retrieved successfully.");
    }

    [HttpGet("assigned-to-me")]
    [Authorize(Policy = "RequireStaffRole")]
    public async Task<ActionResult<ApiResponse<PagedResult<MaintenanceRequestSummaryDto>>>> GetAssignedToMe(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        CancellationToken ct = default)
    {
        var result = await _maintenanceService.GetAssignedToMeAsync(pageNumber, pageSize, status, priority, ct);
        return OkResponse(result, "Assigned maintenance tasks retrieved successfully.");
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<MaintenanceRequestDetailDto>>> GetRequest(Guid id, CancellationToken ct)
    {
        var result = await _maintenanceService.GetRequestByIdAsync(id, ct);
        return OkResponse(result, "Maintenance request details retrieved successfully.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<MaintenanceRequestDetailDto>>> UpdateRequest(
        Guid id,
        [FromBody] UpdateMaintenanceRequest request,
        CancellationToken ct)
    {
        var result = await _maintenanceService.UpdateRequestAsync(id, request, ct);
        return OkResponse(result, "Maintenance request updated successfully.");
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "RequireStaffOrAdminRole")]
    public async Task<ActionResult<ApiResponse<MaintenanceRequestDetailDto>>> UpdateStatus(
        Guid id,
        [FromBody] UpdateMaintenanceStatusRequest request,
        CancellationToken ct)
    {
        var result = await _maintenanceService.UpdateStatusAsync(id, request, ct);
        return OkResponse(result, "Maintenance request status updated successfully.");
    }

    [HttpPatch("{id:guid}/assign")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<ActionResult<ApiResponse<MaintenanceRequestDetailDto>>> AssignStaff(
        Guid id,
        [FromBody] AssignMaintenanceRequest request,
        CancellationToken ct)
    {
        var result = await _maintenanceService.AssignStaffAsync(id, request, ct);
        return OkResponse(result, "Maintenance request assigned to staff successfully.");
    }

    [HttpPost("{id:guid}/notes")]
    public async Task<ActionResult<ApiResponse<MaintenanceNoteDto>>> AddNote(
        Guid id,
        [FromBody] AddMaintenanceNoteRequest request,
        CancellationToken ct)
    {
        var result = await _maintenanceService.AddNoteAsync(id, request, ct);
        return CreatedResponse(nameof(GetRequest), new { id }, result, "Maintenance note added successfully.");
    }

    [HttpGet("{id:guid}/history")]
    public async Task<ActionResult<ApiResponse<List<MaintenanceHistoryDto>>>> GetHistory(Guid id, CancellationToken ct)
    {
        var result = await _maintenanceService.GetHistoryAsync(id, ct);
        return OkResponse(result, "Maintenance request history retrieved successfully.");
    }
}

