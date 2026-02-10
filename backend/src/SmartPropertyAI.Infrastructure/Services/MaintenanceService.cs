using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.AuditLogs;
using SmartPropertyAI.Application.Features.Maintenance;
using SmartPropertyAI.Application.Features.Maintenance.DTOs;
using SmartPropertyAI.Application.Features.Notifications;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class MaintenanceService : IMaintenanceService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationService _notificationService;

    public MaintenanceService(
        ApplicationDbContext context,
        ICurrentUserService currentUserService,
        IAuditLogService auditLogService,
        INotificationService notificationService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
    }

    public async Task<MaintenanceRequestDetailDto> CreateRequestAsync(CreateMaintenanceRequest request, CancellationToken ct = default)
    {
        Guid residentId;
        Guid apartmentId;

        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var resident = await _context.Residents
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active, ct);

            if (resident == null)
            {
                throw new ForbiddenException("You must be an active resident to submit maintenance requests.");
            }

            residentId = resident.Id;
            apartmentId = resident.ApartmentId;
        }
        else
        {
            // Administrator creating on behalf of resident
            if (!request.ResidentId.HasValue)
            {
                throw new ValidationException("ResidentId", "ResidentId is required when creating a ticket as administrator.");
            }

            var resident = await _context.Residents
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == request.ResidentId.Value && r.Status == ResidentStatus.Active, ct);

            if (resident == null)
            {
                throw new NotFoundException("Resident", request.ResidentId.Value);
            }

            residentId = resident.Id;
            apartmentId = resident.ApartmentId;
        }

        if (!Enum.TryParse<MaintenanceCategory>(request.Category, true, out var category))
        {
            throw new ValidationException("Category", "Invalid maintenance category specified.");
        }

        if (!Enum.TryParse<MaintenancePriority>(request.Priority, true, out var priority))
        {
            throw new ValidationException("Priority", "Invalid maintenance priority specified.");
        }

        var maintenanceRequest = new MaintenanceRequest
        {
            ResidentId = residentId,
            ApartmentId = apartmentId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Category = category,
            Priority = priority,
            Status = MaintenanceStatus.Pending,
            ImageUrl = request.ImageUrl?.Trim()
        };

        // Add initial history entry
        maintenanceRequest.History.Add(new MaintenanceHistory
        {
            ChangedByUserId = _currentUserService.UserId ?? Guid.Empty,
            ChangedByName = _currentUserService.Email ?? "Resident",
            PreviousStatus = MaintenanceStatus.Pending,
            NewStatus = MaintenanceStatus.Pending,
            ChangeReason = "Ticket submitted by resident",
            Timestamp = DateTime.UtcNow
        });

        _context.MaintenanceRequests.Add(maintenanceRequest);
        await _context.SaveChangesAsync(ct);

        await _auditLogService.LogActionAsync(
            "MaintenanceCreated",
            nameof(MaintenanceRequest),
            maintenanceRequest.Id.ToString(),
            null,
            new { maintenanceRequest.Title, Status = maintenanceRequest.Status.ToString(), maintenanceRequest.Priority },
            ct);

        return await GetRequestByIdAsync(maintenanceRequest.Id, ct);
    }

    public async Task<PagedResult<MaintenanceRequestSummaryDto>> GetRequestsAsync(MaintenanceFilterDto filter, CancellationToken ct = default)
    {
        var query = _context.MaintenanceRequests
            .Include(m => m.Resident)
            .Include(m => m.Apartment)
                .ThenInclude(a => a.Building)
                    .ThenInclude(b => b.Property)
            .Include(m => m.AssignedStaff)
            .AsNoTracking()
            .AsQueryable();

        // Staff filter
        if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (staff == null)
            {
                return new PagedResult<MaintenanceRequestSummaryDto>(new List<MaintenanceRequestSummaryDto>(), 0, filter.PageNumber, filter.PageSize);
            }

            // Staff can see tickets assigned to them or for their assigned property
            query = query.Where(m => m.AssignedStaffId == staff.Id || m.Apartment.Building.PropertyId == staff.PropertyId);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<MaintenanceStatus>(filter.Status, true, out var status))
        {
            query = query.Where(m => m.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(filter.Priority) && Enum.TryParse<MaintenancePriority>(filter.Priority, true, out var priority))
        {
            query = query.Where(m => m.Priority == priority);
        }

        if (!string.IsNullOrWhiteSpace(filter.Category) && Enum.TryParse<MaintenanceCategory>(filter.Category, true, out var cat))
        {
            query = query.Where(m => m.Category == cat);
        }

        if (filter.PropertyId.HasValue)
        {
            query = query.Where(m => m.Apartment.Building.PropertyId == filter.PropertyId.Value);
        }

        if (filter.AssignedStaffId.HasValue)
        {
            query = query.Where(m => m.AssignedStaffId == filter.AssignedStaffId.Value);
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(m => m.CreatedAt >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(m => m.CreatedAt <= filter.EndDate.Value);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(m => new MaintenanceRequestSummaryDto
            {
                Id = m.Id,
                ResidentId = m.ResidentId,
                ResidentName = m.Resident.FullName,
                ApartmentId = m.ApartmentId,
                ApartmentNumber = m.Apartment.ApartmentNumber,
                BuildingName = m.Apartment.Building.Name,
                PropertyName = m.Apartment.Building.Property.Name,
                Title = m.Title,
                Category = m.Category.ToString(),
                Priority = m.Priority.ToString(),
                Status = m.Status.ToString(),
                AssignedStaffId = m.AssignedStaffId,
                AssignedStaffName = m.AssignedStaff != null ? m.AssignedStaff.Position : null,
                CreatedAt = m.CreatedAt,
                ResolvedAt = m.ResolvedAt
            })
            .ToListAsync(ct);

        return new PagedResult<MaintenanceRequestSummaryDto>(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<MaintenanceRequestDetailDto> GetRequestByIdAsync(Guid id, CancellationToken ct = default)
    {
        var request = await _context.MaintenanceRequests
            .Include(m => m.Resident)
            .Include(m => m.Apartment)
                .ThenInclude(a => a.Building)
                    .ThenInclude(b => b.Property)
            .Include(m => m.AssignedStaff)
            .Include(m => m.Notes)
            .Include(m => m.History)
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        if (request == null)
        {
            throw new NotFoundException("MaintenanceRequest", id);
        }

        var isResident = _currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator);
        var isStaff = _currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator);

        if (isResident)
        {
            var userId = _currentUserService.UserId;
            if (request.Resident.UserId != userId)
            {
                throw new ForbiddenException("You do not have permission to view this maintenance request.");
            }
        }
        else if (isStaff)
        {
            var userId = _currentUserService.UserId;
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (staff == null || (request.AssignedStaffId != staff.Id && request.Apartment.Building.PropertyId != staff.PropertyId))
            {
                throw new ForbiddenException("You are not assigned to this maintenance request or its property.");
            }
        }

        // Filter notes: if resident, hide internal notes
        var visibleNotes = request.Notes
            .Where(n => !isResident || !n.IsInternalOnly)
            .OrderBy(n => n.CreatedAt)
            .Select(n => new MaintenanceNoteDto
            {
                Id = n.Id,
                MaintenanceRequestId = n.MaintenanceRequestId,
                AuthorUserId = n.AuthorUserId,
                AuthorName = n.AuthorName,
                NoteText = n.NoteText,
                IsInternalOnly = n.IsInternalOnly,
                CreatedAt = n.CreatedAt
            })
            .ToList();

        var historyList = request.History
            .OrderBy(h => h.Timestamp)
            .Select(h => new MaintenanceHistoryDto
            {
                Id = h.Id,
                MaintenanceRequestId = h.MaintenanceRequestId,
                ChangedByUserId = h.ChangedByUserId,
                ChangedByName = h.ChangedByName,
                PreviousStatus = h.PreviousStatus.ToString(),
                NewStatus = h.NewStatus.ToString(),
                ChangeReason = h.ChangeReason,
                Timestamp = h.Timestamp
            })
            .ToList();

        return new MaintenanceRequestDetailDto
        {
            Id = request.Id,
            ResidentId = request.ResidentId,
            ResidentName = request.Resident.FullName,
            ResidentPhone = request.Resident.PhoneNumber,
            ApartmentId = request.ApartmentId,
            ApartmentNumber = request.Apartment.ApartmentNumber,
            BuildingId = request.Apartment.BuildingId,
            BuildingName = request.Apartment.Building.Name,
            PropertyId = request.Apartment.Building.PropertyId,
            PropertyName = request.Apartment.Building.Property.Name,
            Title = request.Title,
            Description = request.Description,
            Category = request.Category.ToString(),
            Priority = request.Priority.ToString(),
            Status = request.Status.ToString(),
            AssignedStaffId = request.AssignedStaffId,
            AssignedStaffName = request.AssignedStaff?.Position,
            ImageUrl = request.ImageUrl,
            CreatedAt = request.CreatedAt,
            UpdatedAt = request.UpdatedAt,
            ResolvedAt = request.ResolvedAt,
            Notes = visibleNotes,
            History = historyList
        };
    }

    public async Task<MaintenanceRequestDetailDto> UpdateRequestAsync(Guid id, UpdateMaintenanceRequest request, CancellationToken ct = default)
    {
        var maintenanceRequest = await _context.MaintenanceRequests.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (maintenanceRequest == null)
        {
            throw new NotFoundException("MaintenanceRequest", id);
        }

        if (!Enum.TryParse<MaintenancePriority>(request.Priority, true, out var priority))
        {
            throw new ValidationException("Priority", "Invalid maintenance priority specified.");
        }

        var previous = new { maintenanceRequest.Title, maintenanceRequest.Description, Priority = maintenanceRequest.Priority.ToString() };

        maintenanceRequest.Title = request.Title.Trim();
        maintenanceRequest.Description = request.Description.Trim();
        maintenanceRequest.Priority = priority;
        if (request.ImageUrl != null) maintenanceRequest.ImageUrl = request.ImageUrl.Trim();

        await _context.SaveChangesAsync(ct);

        await _auditLogService.LogActionAsync(
            "MaintenanceUpdated",
            nameof(MaintenanceRequest),
            id.ToString(),
            previous,
            new { maintenanceRequest.Title, maintenanceRequest.Description, Priority = maintenanceRequest.Priority.ToString() },
            ct);

        return await GetRequestByIdAsync(id, ct);
    }

    public async Task<MaintenanceRequestDetailDto> UpdateStatusAsync(Guid id, UpdateMaintenanceStatusRequest request, CancellationToken ct = default)
    {
        var maintenanceRequest = await _context.MaintenanceRequests
            .Include(m => m.Resident)
            .Include(m => m.Apartment)
                .ThenInclude(a => a.Building)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        if (maintenanceRequest == null)
        {
            throw new NotFoundException("MaintenanceRequest", id);
        }

        if (!Enum.TryParse<MaintenanceStatus>(request.Status, true, out var newStatus))
        {
            throw new ValidationException("Status", "Invalid maintenance status specified.");
        }

        var currentStatus = maintenanceRequest.Status;

        // Staff access check
        if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (staff == null || maintenanceRequest.AssignedStaffId != staff.Id)
            {
                throw new ForbiddenException("Staff can only update progress on maintenance requests assigned to them.");
            }

            // Staff can only mark InProgress or Resolved
            if (newStatus != MaintenanceStatus.InProgress && newStatus != MaintenanceStatus.Resolved)
            {
                throw new ForbiddenException("Staff members can only set status to InProgress or Resolved.");
            }
        }

        // Validate state transitions
        ValidateStateTransition(currentStatus, newStatus, _currentUserService.IsInRole(UserRoles.Administrator));

        maintenanceRequest.Status = newStatus;
        if (newStatus == MaintenanceStatus.Resolved)
        {
            maintenanceRequest.ResolvedAt = DateTime.UtcNow;
        }

        // Add history entry
        _context.MaintenanceHistories.Add(new MaintenanceHistory
        {
            MaintenanceRequestId = id,
            ChangedByUserId = _currentUserService.UserId ?? Guid.Empty,
            ChangedByName = _currentUserService.Email ?? "User",
            PreviousStatus = currentStatus,
            NewStatus = newStatus,
            ChangeReason = request.Comment?.Trim(),
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);

        // Notify Resident
        await _notificationService.SendNotificationAsync(
            maintenanceRequest.Resident.UserId,
            $"Maintenance Request Updated: {maintenanceRequest.Title}",
            $"Your maintenance request status has changed from {currentStatus} to {newStatus}.",
            NotificationType.StatusChange,
            ct);

        await _auditLogService.LogActionAsync(
            "MaintenanceStatusChanged",
            nameof(MaintenanceRequest),
            id.ToString(),
            new { Status = currentStatus.ToString() },
            new { Status = newStatus.ToString(), Comment = request.Comment },
            ct);

        return await GetRequestByIdAsync(id, ct);
    }

    public async Task<MaintenanceRequestDetailDto> AssignStaffAsync(Guid id, AssignMaintenanceRequest request, CancellationToken ct = default)
    {
        var maintenanceRequest = await _context.MaintenanceRequests
            .Include(m => m.Apartment)
                .ThenInclude(a => a.Building)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        if (maintenanceRequest == null)
        {
            throw new NotFoundException("MaintenanceRequest", id);
        }

        var staff = await _context.StaffMembers
            .Include(s => s.Property)
            .FirstOrDefaultAsync(s => s.Id == request.StaffId && s.EmploymentStatus == EmploymentStatus.Active, ct);

        if (staff == null)
        {
            throw new NotFoundException("Staff", request.StaffId);
        }

        // Verify staff property matches
        if (staff.PropertyId != maintenanceRequest.Apartment.Building.PropertyId)
        {
            throw new ValidationException("StaffId", "The selected staff member is not assigned to the property containing this unit.");
        }

        var previousStaffId = maintenanceRequest.AssignedStaffId;
        var previousStatus = maintenanceRequest.Status;

        maintenanceRequest.AssignedStaffId = staff.Id;
        if (maintenanceRequest.Status == MaintenanceStatus.Pending || maintenanceRequest.Status == MaintenanceStatus.Approved)
        {
            maintenanceRequest.Status = MaintenanceStatus.Assigned;
        }

        _context.MaintenanceHistories.Add(new MaintenanceHistory
        {
            MaintenanceRequestId = id,
            ChangedByUserId = _currentUserService.UserId ?? Guid.Empty,
            ChangedByName = _currentUserService.Email ?? "Administrator",
            PreviousStatus = previousStatus,
            NewStatus = maintenanceRequest.Status,
            ChangeReason = $"Assigned to staff: {staff.Position} ({staff.EmployeeNumber})",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);

        // Notify Staff
        await _notificationService.SendNotificationAsync(
            staff.UserId,
            $"New Maintenance Request Assigned: {maintenanceRequest.Title}",
            $"You have been assigned maintenance ticket #{maintenanceRequest.Id}.",
            NotificationType.Assignment,
            ct);

        await _auditLogService.LogActionAsync(
            "MaintenanceAssigned",
            nameof(MaintenanceRequest),
            id.ToString(),
            new { AssignedStaffId = previousStaffId, Status = previousStatus.ToString() },
            new { AssignedStaffId = staff.Id, Status = maintenanceRequest.Status.ToString() },
            ct);

        return await GetRequestByIdAsync(id, ct);
    }

    public async Task<MaintenanceNoteDto> AddNoteAsync(Guid id, AddMaintenanceNoteRequest request, CancellationToken ct = default)
    {
        var maintenanceRequest = await _context.MaintenanceRequests
            .Include(m => m.Resident)
            .Include(m => m.Apartment)
                .ThenInclude(a => a.Building)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        if (maintenanceRequest == null)
        {
            throw new NotFoundException("MaintenanceRequest", id);
        }

        var isResident = _currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator);
        var isStaff = _currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator);

        if (isResident)
        {
            var userId = _currentUserService.UserId;
            if (maintenanceRequest.Resident.UserId != userId)
            {
                throw new ForbiddenException("You can only add notes to your own maintenance requests.");
            }
        }
        else if (isStaff)
        {
            var userId = _currentUserService.UserId;
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (staff == null || (maintenanceRequest.AssignedStaffId != staff.Id && maintenanceRequest.Apartment.Building.PropertyId != staff.PropertyId))
            {
                throw new ForbiddenException("You are not assigned to this maintenance request.");
            }
        }

        // Residents cannot create internal-only notes
        var isInternal = !isResident && request.IsInternalOnly;

        var note = new MaintenanceNote
        {
            MaintenanceRequestId = id,
            AuthorUserId = _currentUserService.UserId ?? Guid.Empty,
            AuthorName = _currentUserService.Email ?? "User",
            NoteText = request.NoteText.Trim(),
            IsInternalOnly = isInternal
        };

        _context.MaintenanceNotes.Add(note);
        await _context.SaveChangesAsync(ct);

        return new MaintenanceNoteDto
        {
            Id = note.Id,
            MaintenanceRequestId = note.MaintenanceRequestId,
            AuthorUserId = note.AuthorUserId,
            AuthorName = note.AuthorName,
            NoteText = note.NoteText,
            IsInternalOnly = note.IsInternalOnly,
            CreatedAt = note.CreatedAt
        };
    }

    public async Task<List<MaintenanceHistoryDto>> GetHistoryAsync(Guid id, CancellationToken ct = default)
    {
        var detail = await GetRequestByIdAsync(id, ct);
        return detail.History;
    }

    public async Task<PagedResult<MaintenanceRequestSummaryDto>> GetMyRequestsAsync(int pageNumber, int pageSize, string? status, CancellationToken ct = default)
    {
        var userId = _currentUserService.UserId;
        var resident = await _context.Residents
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active, ct);

        if (resident == null)
        {
            return new PagedResult<MaintenanceRequestSummaryDto>(new List<MaintenanceRequestSummaryDto>(), 0, pageNumber, pageSize);
        }

        var filter = new MaintenanceFilterDto
        {
            PageNumber = pageNumber,
            PageSize = pageSize,
            Status = status
        };

        var query = _context.MaintenanceRequests
            .Include(m => m.Resident)
            .Include(m => m.Apartment)
                .ThenInclude(a => a.Building)
                    .ThenInclude(b => b.Property)
            .Include(m => m.AssignedStaff)
            .AsNoTracking()
            .Where(m => m.ResidentId == resident.Id);

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<MaintenanceStatus>(filter.Status, true, out var st))
        {
            query = query.Where(m => m.Status == st);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MaintenanceRequestSummaryDto
            {
                Id = m.Id,
                ResidentId = m.ResidentId,
                ResidentName = m.Resident.FullName,
                ApartmentId = m.ApartmentId,
                ApartmentNumber = m.Apartment.ApartmentNumber,
                BuildingName = m.Apartment.Building.Name,
                PropertyName = m.Apartment.Building.Property.Name,
                Title = m.Title,
                Category = m.Category.ToString(),
                Priority = m.Priority.ToString(),
                Status = m.Status.ToString(),
                AssignedStaffId = m.AssignedStaffId,
                AssignedStaffName = m.AssignedStaff != null ? m.AssignedStaff.Position : null,
                CreatedAt = m.CreatedAt,
                ResolvedAt = m.ResolvedAt
            })
            .ToListAsync(ct);

        return new PagedResult<MaintenanceRequestSummaryDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<PagedResult<MaintenanceRequestSummaryDto>> GetAssignedToMeAsync(int pageNumber, int pageSize, string? status, string? priority, CancellationToken ct = default)
    {
        var userId = _currentUserService.UserId;
        var staff = await _context.StaffMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.EmploymentStatus == EmploymentStatus.Active, ct);

        if (staff == null)
        {
            return new PagedResult<MaintenanceRequestSummaryDto>(new List<MaintenanceRequestSummaryDto>(), 0, pageNumber, pageSize);
        }

        var query = _context.MaintenanceRequests
            .Include(m => m.Resident)
            .Include(m => m.Apartment)
                .ThenInclude(a => a.Building)
                    .ThenInclude(b => b.Property)
            .Include(m => m.AssignedStaff)
            .AsNoTracking()
            .Where(m => m.AssignedStaffId == staff.Id);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<MaintenanceStatus>(status, true, out var st))
        {
            query = query.Where(m => m.Status == st);
        }

        if (!string.IsNullOrWhiteSpace(priority) && Enum.TryParse<MaintenancePriority>(priority, true, out var pr))
        {
            query = query.Where(m => m.Priority == pr);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MaintenanceRequestSummaryDto
            {
                Id = m.Id,
                ResidentId = m.ResidentId,
                ResidentName = m.Resident.FullName,
                ApartmentId = m.ApartmentId,
                ApartmentNumber = m.Apartment.ApartmentNumber,
                BuildingName = m.Apartment.Building.Name,
                PropertyName = m.Apartment.Building.Property.Name,
                Title = m.Title,
                Category = m.Category.ToString(),
                Priority = m.Priority.ToString(),
                Status = m.Status.ToString(),
                AssignedStaffId = m.AssignedStaffId,
                AssignedStaffName = m.AssignedStaff != null ? m.AssignedStaff.Position : null,
                CreatedAt = m.CreatedAt,
                ResolvedAt = m.ResolvedAt
            })
            .ToListAsync(ct);

        return new PagedResult<MaintenanceRequestSummaryDto>(items, totalCount, pageNumber, pageSize);
    }

    private static void ValidateStateTransition(MaintenanceStatus current, MaintenanceStatus target, bool isAdmin)
    {
        if (current == target) return;

        var isValid = (current, target) switch
        {
            (MaintenanceStatus.Pending, MaintenanceStatus.Approved) => true,
            (MaintenanceStatus.Pending, MaintenanceStatus.Rejected) => true,
            (MaintenanceStatus.Pending, MaintenanceStatus.Assigned) when isAdmin => true,

            (MaintenanceStatus.Approved, MaintenanceStatus.Assigned) => true,
            (MaintenanceStatus.Approved, MaintenanceStatus.Rejected) when isAdmin => true,

            (MaintenanceStatus.Assigned, MaintenanceStatus.InProgress) => true,
            (MaintenanceStatus.Assigned, MaintenanceStatus.Approved) when isAdmin => true,

            (MaintenanceStatus.InProgress, MaintenanceStatus.Resolved) => true,
            (MaintenanceStatus.InProgress, MaintenanceStatus.Assigned) when isAdmin => true,

            (MaintenanceStatus.Resolved, MaintenanceStatus.Closed) => true,
            (MaintenanceStatus.Resolved, MaintenanceStatus.InProgress) => true, // Reopened

            _ => false
        };

        if (!isValid)
        {
            throw new DomainException($"Direct transition from '{current}' to '{target}' is not allowed.");
        }
    }
}
