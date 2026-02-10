using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.AuditLogs;
using SmartPropertyAI.Application.Features.Visitors;
using SmartPropertyAI.Application.Features.Visitors.DTOs;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class VisitorService : IVisitorService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditLogService _auditLogService;

    public VisitorService(
        ApplicationDbContext context,
        ICurrentUserService currentUserService,
        IAuditLogService auditLogService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _auditLogService = auditLogService;
    }

    public async Task<VisitorDetailDto> CreateVisitorAsync(CreateVisitorRequest request, CancellationToken ct = default)
    {
        Guid residentId;

        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var resident = await _context.Residents
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active, ct);

            if (resident == null)
            {
                throw new ForbiddenException("You must be an active resident to register visitors.");
            }

            residentId = resident.Id;
        }
        else
        {
            if (!request.ResidentId.HasValue)
            {
                throw new ValidationException("ResidentId", "ResidentId is required when registering a visitor as administrator.");
            }

            var resident = await _context.Residents
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == request.ResidentId.Value && r.Status == ResidentStatus.Active, ct);

            if (resident == null)
            {
                throw new NotFoundException("Resident", request.ResidentId.Value);
            }

            residentId = resident.Id;
        }

        var arrivalUtc = request.ExpectedArrival.Kind == DateTimeKind.Utc
            ? request.ExpectedArrival
            : DateTime.SpecifyKind(request.ExpectedArrival, DateTimeKind.Utc);
        var departureUtc = request.ExpectedDeparture.Kind == DateTimeKind.Utc
            ? request.ExpectedDeparture
            : DateTime.SpecifyKind(request.ExpectedDeparture, DateTimeKind.Utc);

        var visitor = new Visitor
        {
            ResidentId = residentId,
            VisitorName = request.VisitorName.Trim(),
            VisitorPhone = request.VisitorPhone.Trim(),
            Purpose = request.Purpose.Trim(),
            ExpectedArrival = arrivalUtc,
            ExpectedDeparture = departureUtc,
            Status = VisitorStatus.Pending
        };

        _context.Visitors.Add(visitor);
        await _context.SaveChangesAsync(ct);

        await _auditLogService.LogActionAsync(
            "VisitorRegistered",
            nameof(Visitor),
            visitor.Id.ToString(),
            null,
            new { visitor.VisitorName, visitor.Purpose, visitor.ExpectedArrival },
            ct);

        return await GetVisitorByIdAsync(visitor.Id, ct);
    }

    public async Task<PagedResult<VisitorSummaryDto>> GetVisitorsAsync(VisitorFilterDto filter, CancellationToken ct = default)
    {
        var query = _context.Visitors
            .Include(v => v.Resident)
                .ThenInclude(r => r.Apartment)
                    .ThenInclude(a => a.Building)
                        .ThenInclude(b => b.Property)
            .AsNoTracking()
            .AsQueryable();

        if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (staff == null)
            {
                return new PagedResult<VisitorSummaryDto>(new List<VisitorSummaryDto>(), 0, filter.PageNumber, filter.PageSize);
            }

            query = query.Where(v => v.Resident.Apartment.Building.PropertyId == staff.PropertyId);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<VisitorStatus>(filter.Status, true, out var status))
        {
            query = query.Where(v => v.Status == status);
        }

        if (filter.PropertyId.HasValue)
        {
            query = query.Where(v => v.Resident.Apartment.Building.PropertyId == filter.PropertyId.Value);
        }

        if (filter.Date.HasValue)
        {
            var targetDate = filter.Date.Value.Date;
            query = query.Where(v => v.ExpectedArrival.Date == targetDate);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(v => v.ExpectedArrival)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(v => new VisitorSummaryDto
            {
                Id = v.Id,
                ResidentId = v.ResidentId,
                ResidentName = v.Resident.FullName,
                ApartmentNumber = v.Resident.Apartment.ApartmentNumber,
                BuildingName = v.Resident.Apartment.Building.Name,
                PropertyName = v.Resident.Apartment.Building.Property.Name,
                VisitorName = v.VisitorName,
                VisitorPhone = v.VisitorPhone,
                Purpose = v.Purpose,
                ExpectedArrival = v.ExpectedArrival,
                ExpectedDeparture = v.ExpectedDeparture,
                Status = v.Status.ToString(),
                CheckedInAt = v.CheckedInAt,
                CheckedOutAt = v.CheckedOutAt,
                CreatedAt = v.CreatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<VisitorSummaryDto>(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task<VisitorDetailDto> GetVisitorByIdAsync(Guid id, CancellationToken ct = default)
    {
        var visitor = await _context.Visitors
            .Include(v => v.Resident)
                .ThenInclude(r => r.Apartment)
                    .ThenInclude(a => a.Building)
                        .ThenInclude(b => b.Property)
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == id, ct);

        if (visitor == null)
        {
            throw new NotFoundException("Visitor", id);
        }

        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            if (visitor.Resident.UserId != userId)
            {
                throw new ForbiddenException("You do not have access to this visitor pass.");
            }
        }
        else if (_currentUserService.IsInRole(UserRoles.Staff) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            var staff = await _context.StaffMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId && s.EmploymentStatus == EmploymentStatus.Active, ct);

            if (staff == null || visitor.Resident.Apartment.Building.PropertyId != staff.PropertyId)
            {
                throw new ForbiddenException("You are not assigned to the property hosting this visitor.");
            }
        }

        string? approvedByName = null;
        if (visitor.ApprovedBy.HasValue)
        {
            var approver = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == visitor.ApprovedBy.Value, ct);
            approvedByName = approver?.FullName;
        }

        return new VisitorDetailDto
        {
            Id = visitor.Id,
            ResidentId = visitor.ResidentId,
            ResidentName = visitor.Resident.FullName,
            ResidentPhone = visitor.Resident.PhoneNumber,
            ApartmentNumber = visitor.Resident.Apartment.ApartmentNumber,
            BuildingName = visitor.Resident.Apartment.Building.Name,
            PropertyName = visitor.Resident.Apartment.Building.Property.Name,
            VisitorName = visitor.VisitorName,
            VisitorPhone = visitor.VisitorPhone,
            Purpose = visitor.Purpose,
            ExpectedArrival = visitor.ExpectedArrival,
            ExpectedDeparture = visitor.ExpectedDeparture,
            Status = visitor.Status.ToString(),
            ApprovedBy = visitor.ApprovedBy,
            ApprovedByName = approvedByName,
            CheckedInAt = visitor.CheckedInAt,
            CheckedOutAt = visitor.CheckedOutAt,
            CreatedAt = visitor.CreatedAt,
            UpdatedAt = visitor.UpdatedAt
        };
    }

    public async Task<VisitorDetailDto> UpdateVisitorAsync(Guid id, UpdateVisitorRequest request, CancellationToken ct = default)
    {
        var visitor = await _context.Visitors
            .Include(v => v.Resident)
            .FirstOrDefaultAsync(v => v.Id == id, ct);

        if (visitor == null)
        {
            throw new NotFoundException("Visitor", id);
        }

        if (_currentUserService.IsInRole(UserRoles.Resident) && !_currentUserService.IsInRole(UserRoles.Administrator))
        {
            var userId = _currentUserService.UserId;
            if (visitor.Resident.UserId != userId)
            {
                throw new ForbiddenException("You can only modify visitor passes registered by yourself.");
            }

            if (visitor.Status == VisitorStatus.CheckedIn || visitor.Status == VisitorStatus.CheckedOut)
            {
                throw new ConflictException("Cannot modify details of a visitor who has already checked in or checked out.");
            }
        }

        visitor.VisitorName = request.VisitorName.Trim();
        visitor.VisitorPhone = request.VisitorPhone.Trim();
        visitor.Purpose = request.Purpose.Trim();
        visitor.ExpectedArrival = request.ExpectedArrival.Kind == DateTimeKind.Utc
            ? request.ExpectedArrival
            : DateTime.SpecifyKind(request.ExpectedArrival, DateTimeKind.Utc);
        visitor.ExpectedDeparture = request.ExpectedDeparture.Kind == DateTimeKind.Utc
            ? request.ExpectedDeparture
            : DateTime.SpecifyKind(request.ExpectedDeparture, DateTimeKind.Utc);

        await _context.SaveChangesAsync(ct);

        await _auditLogService.LogActionAsync(
            "VisitorUpdated",
            nameof(Visitor),
            id.ToString(),
            null,
            new { visitor.VisitorName, visitor.Purpose, visitor.ExpectedArrival },
            ct);

        return await GetVisitorByIdAsync(id, ct);
    }

    public async Task<VisitorDetailDto> ApproveVisitorAsync(Guid id, CancellationToken ct = default)
    {
        var visitor = await _context.Visitors.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (visitor == null)
        {
            throw new NotFoundException("Visitor", id);
        }

        var previousStatus = visitor.Status;
        visitor.Status = VisitorStatus.Approved;
        visitor.ApprovedBy = _currentUserService.UserId;

        await _context.SaveChangesAsync(ct);

        await _auditLogService.LogActionAsync(
            "VisitorApproved",
            nameof(Visitor),
            id.ToString(),
            new { Status = previousStatus.ToString() },
            new { Status = visitor.Status.ToString() },
            ct);

        return await GetVisitorByIdAsync(id, ct);
    }

    public async Task<VisitorDetailDto> RejectVisitorAsync(Guid id, CancellationToken ct = default)
    {
        var visitor = await _context.Visitors.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (visitor == null)
        {
            throw new NotFoundException("Visitor", id);
        }

        var previousStatus = visitor.Status;
        visitor.Status = VisitorStatus.Rejected;
        visitor.ApprovedBy = _currentUserService.UserId;

        await _context.SaveChangesAsync(ct);

        await _auditLogService.LogActionAsync(
            "VisitorRejected",
            nameof(Visitor),
            id.ToString(),
            new { Status = previousStatus.ToString() },
            new { Status = visitor.Status.ToString() },
            ct);

        return await GetVisitorByIdAsync(id, ct);
    }

    public async Task<VisitorDetailDto> CheckInVisitorAsync(Guid id, CancellationToken ct = default)
    {
        var visitor = await _context.Visitors.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (visitor == null)
        {
            throw new NotFoundException("Visitor", id);
        }

        if (visitor.Status == VisitorStatus.CheckedIn)
        {
            throw new ConflictException("Visitor is already checked in.");
        }

        var previousStatus = visitor.Status;
        visitor.Status = VisitorStatus.CheckedIn;
        visitor.CheckedInAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        await _auditLogService.LogActionAsync(
            "VisitorCheckedIn",
            nameof(Visitor),
            id.ToString(),
            new { Status = previousStatus.ToString() },
            new { Status = visitor.Status.ToString(), visitor.CheckedInAt },
            ct);

        return await GetVisitorByIdAsync(id, ct);
    }

    public async Task<VisitorDetailDto> CheckOutVisitorAsync(Guid id, CancellationToken ct = default)
    {
        var visitor = await _context.Visitors.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (visitor == null)
        {
            throw new NotFoundException("Visitor", id);
        }

        if (visitor.Status != VisitorStatus.CheckedIn)
        {
            throw new ConflictException("Cannot check out a visitor who has not checked in.");
        }

        var previousStatus = visitor.Status;
        visitor.Status = VisitorStatus.CheckedOut;
        visitor.CheckedOutAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        await _auditLogService.LogActionAsync(
            "VisitorCheckedOut",
            nameof(Visitor),
            id.ToString(),
            new { Status = previousStatus.ToString() },
            new { Status = visitor.Status.ToString(), visitor.CheckedOutAt },
            ct);

        return await GetVisitorByIdAsync(id, ct);
    }

    public async Task<PagedResult<VisitorSummaryDto>> GetMyVisitorsAsync(int pageNumber, int pageSize, CancellationToken ct = default)
    {
        var userId = _currentUserService.UserId;
        var resident = await _context.Residents
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active, ct);

        if (resident == null)
        {
            return new PagedResult<VisitorSummaryDto>(new List<VisitorSummaryDto>(), 0, pageNumber, pageSize);
        }

        var query = _context.Visitors
            .Include(v => v.Resident)
                .ThenInclude(r => r.Apartment)
                    .ThenInclude(a => a.Building)
                        .ThenInclude(b => b.Property)
            .AsNoTracking()
            .Where(v => v.ResidentId == resident.Id);

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(v => v.ExpectedArrival)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(v => new VisitorSummaryDto
            {
                Id = v.Id,
                ResidentId = v.ResidentId,
                ResidentName = v.Resident.FullName,
                ApartmentNumber = v.Resident.Apartment.ApartmentNumber,
                BuildingName = v.Resident.Apartment.Building.Name,
                PropertyName = v.Resident.Apartment.Building.Property.Name,
                VisitorName = v.VisitorName,
                VisitorPhone = v.VisitorPhone,
                Purpose = v.Purpose,
                ExpectedArrival = v.ExpectedArrival,
                ExpectedDeparture = v.ExpectedDeparture,
                Status = v.Status.ToString(),
                CheckedInAt = v.CheckedInAt,
                CheckedOutAt = v.CheckedOutAt,
                CreatedAt = v.CreatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<VisitorSummaryDto>(items, totalCount, pageNumber, pageSize);
    }
}

