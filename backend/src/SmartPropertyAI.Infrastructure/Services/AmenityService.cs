using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Features.Amenities;
using SmartPropertyAI.Application.Features.Amenities.DTOs;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Services;

public class AmenityService : IAmenityService
{
    private readonly ApplicationDbContext _context;

    public AmenityService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AmenityDto>> GetAmenitiesAsync(Guid? propertyId = null, CancellationToken ct = default)
    {
        await EnsureSeedAmenitiesAsync(ct);

        var query = _context.Amenities
            .Include(a => a.Property)
            .AsNoTracking()
            .Where(a => a.IsActive);

        if (propertyId.HasValue && propertyId.Value != Guid.Empty)
        {
            query = query.Where(a => a.PropertyId == propertyId.Value);
        }

        var items = await query
            .OrderBy(a => a.Name)
            .Select(a => new AmenityDto
            {
                Id = a.Id,
                PropertyId = a.PropertyId,
                PropertyName = a.Property.Name,
                Name = a.Name,
                Description = a.Description,
                ImageUrl = a.ImageUrl,
                Capacity = a.Capacity,
                OpenTime = a.OpenTime.ToString(@"hh\:mm"),
                CloseTime = a.CloseTime.ToString(@"hh\:mm"),
                RulesSummary = a.RulesSummary,
                IsActive = a.IsActive
            })
            .ToListAsync(ct);

        return items;
    }

    public async Task<AmenityDto> GetAmenityByIdAsync(Guid id, CancellationToken ct = default)
    {
        var a = await _context.Amenities
            .Include(a => a.Property)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (a == null)
        {
            throw new NotFoundException(nameof(Amenity), id);
        }

        return new AmenityDto
        {
            Id = a.Id,
            PropertyId = a.PropertyId,
            PropertyName = a.Property.Name,
            Name = a.Name,
            Description = a.Description,
            ImageUrl = a.ImageUrl,
            Capacity = a.Capacity,
            OpenTime = a.OpenTime.ToString(@"hh\:mm"),
            CloseTime = a.CloseTime.ToString(@"hh\:mm"),
            RulesSummary = a.RulesSummary,
            IsActive = a.IsActive
        };
    }

    public async Task<AmenityAvailabilityDto> GetAvailabilityAsync(Guid amenityId, DateTime date, CancellationToken ct = default)
    {
        var amenity = await _context.Amenities
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == amenityId, ct);

        if (amenity == null)
        {
            throw new NotFoundException(nameof(Amenity), amenityId);
        }

        var dateUtc = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);

        var bookings = await _context.AmenityBookings
            .Include(b => b.Resident)
            .AsNoTracking()
            .Where(b => b.AmenityId == amenityId &&
                        b.BookingDate == dateUtc &&
                        b.Status == AmenityBookingStatus.Confirmed)
            .ToListAsync(ct);

        var slots = new List<AmenitySlotDto>();
        var current = amenity.OpenTime;
        var slotDuration = TimeSpan.FromHours(1);

        while (current + slotDuration <= amenity.CloseTime)
        {
            var next = current + slotDuration;
            var isBooked = bookings.Any(b => current < b.EndTime && next > b.StartTime);
            var booking = bookings.FirstOrDefault(b => current < b.EndTime && next > b.StartTime);

            slots.Add(new AmenitySlotDto
            {
                StartTime = current.ToString(@"hh\:mm"),
                EndTime = next.ToString(@"hh\:mm"),
                IsBooked = isBooked,
                BookedBy = isBooked ? booking?.Resident.FullName : null
            });

            current = next;
        }

        return new AmenityAvailabilityDto
        {
            AmenityId = amenity.Id,
            AmenityName = amenity.Name,
            Date = dateUtc,
            Slots = slots
        };
    }

    public async Task<AmenityBookingDto> BookAmenityAsync(
        Guid amenityId,
        Guid userId,
        BookAmenityRequestDto request,
        CancellationToken ct = default)
    {
        var resident = await _context.Residents
            .Include(r => r.Apartment)
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Status == ResidentStatus.Active, ct);

        if (resident == null)
        {
            throw new ForbiddenException("You must have an active resident profile to reserve building amenities.");
        }

        var amenity = await _context.Amenities
            .FirstOrDefaultAsync(a => a.Id == amenityId, ct);

        if (amenity == null || !amenity.IsActive)
        {
            throw new NotFoundException(nameof(Amenity), amenityId);
        }

        if (!TimeSpan.TryParse(request.StartTime, out var startTime) ||
            !TimeSpan.TryParse(request.EndTime, out var endTime))
        {
            throw new ValidationException("Start and End times must be formatted as HH:mm (e.g. '14:00').");
        }

        if (endTime <= startTime)
        {
            throw new ValidationException("End time must be after Start time.");
        }

        if ((endTime - startTime).TotalHours > 4)
        {
            throw new ValidationException("Maximum booking duration is 4 hours per session.");
        }

        if (startTime < amenity.OpenTime || endTime > amenity.CloseTime)
        {
            throw new ValidationException($"This amenity operates between {amenity.OpenTime:hh\\:mm} and {amenity.CloseTime:hh\\:mm}.");
        }

        if (request.GuestCount > amenity.Capacity)
        {
            throw new ValidationException($"Guest count exceeds the maximum amenity capacity of {amenity.Capacity} people.");
        }

        var dateUtc = DateTime.SpecifyKind(request.BookingDate.Date, DateTimeKind.Utc);
        if (dateUtc < DateTime.UtcNow.Date)
        {
            throw new ValidationException("Reservations cannot be booked for past dates.");
        }

        // Temporal Overlap Conflict Prevention
        var hasConflict = await _context.AmenityBookings
            .AnyAsync(b => b.AmenityId == amenityId &&
                           b.Status == AmenityBookingStatus.Confirmed &&
                           b.BookingDate == dateUtc &&
                           startTime < b.EndTime && endTime > b.StartTime, ct);

        if (hasConflict)
        {
            throw new ValidationException("The requested time slot conflicts with an existing confirmed reservation.");
        }

        var booking = new AmenityBooking
        {
            Id = Guid.NewGuid(),
            AmenityId = amenityId,
            ResidentId = resident.Id,
            BookingDate = dateUtc,
            StartTime = startTime,
            EndTime = endTime,
            GuestCount = request.GuestCount <= 0 ? 1 : request.GuestCount,
            Purpose = string.IsNullOrWhiteSpace(request.Purpose) ? "Social Event" : request.Purpose.Trim(),
            Notes = request.Notes,
            Status = AmenityBookingStatus.Confirmed,
            CreatedAt = DateTime.UtcNow
        };

        _context.AmenityBookings.Add(booking);
        await _context.SaveChangesAsync(ct);

        return new AmenityBookingDto
        {
            Id = booking.Id,
            AmenityId = amenity.Id,
            AmenityName = amenity.Name,
            AmenityImageUrl = amenity.ImageUrl,
            ResidentId = resident.Id,
            ResidentName = resident.FullName,
            ApartmentNumber = resident.Apartment?.ApartmentNumber ?? string.Empty,
            BookingDate = booking.BookingDate,
            StartTime = booking.StartTime.ToString(@"hh\:mm"),
            EndTime = booking.EndTime.ToString(@"hh\:mm"),
            GuestCount = booking.GuestCount,
            Purpose = booking.Purpose,
            Notes = booking.Notes,
            Status = booking.Status.ToString(),
            CreatedAt = booking.CreatedAt
        };
    }

    public async Task<List<AmenityBookingDto>> GetMyBookingsAsync(Guid userId, CancellationToken ct = default)
    {
        var resident = await _context.Residents
            .Include(r => r.Apartment)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == userId, ct);

        if (resident == null)
        {
            return new List<AmenityBookingDto>();
        }

        var items = await _context.AmenityBookings
            .Include(b => b.Amenity)
            .Include(b => b.Resident)
                .ThenInclude(r => r.Apartment)
            .AsNoTracking()
            .Where(b => b.ResidentId == resident.Id)
            .OrderByDescending(b => b.BookingDate)
                .ThenByDescending(b => b.StartTime)
            .Select(b => new AmenityBookingDto
            {
                Id = b.Id,
                AmenityId = b.AmenityId,
                AmenityName = b.Amenity.Name,
                AmenityImageUrl = b.Amenity.ImageUrl,
                ResidentId = b.ResidentId,
                ResidentName = b.Resident.FullName,
                ApartmentNumber = b.Resident.Apartment != null ? b.Resident.Apartment.ApartmentNumber : string.Empty,
                BookingDate = b.BookingDate,
                StartTime = b.StartTime.ToString(@"hh\:mm"),
                EndTime = b.EndTime.ToString(@"hh\:mm"),
                GuestCount = b.GuestCount,
                Purpose = b.Purpose,
                Notes = b.Notes,
                Status = b.Status.ToString(),
                CreatedAt = b.CreatedAt
            })
            .ToListAsync(ct);

        return items;
    }

    public async Task<bool> CancelBookingAsync(Guid bookingId, Guid userId, CancellationToken ct = default)
    {
        var resident = await _context.Residents
            .FirstOrDefaultAsync(r => r.UserId == userId, ct);

        if (resident == null)
        {
            throw new ForbiddenException("Resident profile not found.");
        }

        var booking = await _context.AmenityBookings
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.ResidentId == resident.Id, ct);

        if (booking == null)
        {
            throw new NotFoundException(nameof(AmenityBooking), bookingId);
        }

        booking.Status = AmenityBookingStatus.Cancelled;
        booking.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return true;
    }

    private async Task EnsureSeedAmenitiesAsync(CancellationToken ct)
    {
        if (await _context.Amenities.AnyAsync(ct)) return;

        var property = await _context.Properties.FirstOrDefaultAsync(ct);
        if (property == null) return;

        var list = new List<Amenity>
        {
            new Amenity
            {
                Id = Guid.NewGuid(),
                PropertyId = property.Id,
                Name = "Skyline Rooftop BBQ & Terrace Lounge",
                Description = "Panoramic skyline views featuring twin commercial stainless steel Weber grills, granite prep island, fire pit lounge, and dining pergola.",
                ImageUrl = "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80",
                Capacity = 12,
                OpenTime = new TimeSpan(10, 0, 0),
                CloseTime = new TimeSpan(22, 0, 0),
                RulesSummary = "Quiet hours after 10 PM. Clean grill grates and turn off gas burners after use. Strictly no glass containers on deck.",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new Amenity
            {
                Id = Guid.NewGuid(),
                PropertyId = property.Id,
                Name = "Heated Saltwater Swimming Pool & Cabanas",
                Description = "Year-round temperature-controlled saltwater lap pool with private cushioned sun cabanas, outdoor rain showers, and loungers.",
                ImageUrl = "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80",
                Capacity = 20,
                OpenTime = new TimeSpan(7, 0, 0),
                CloseTime = new TimeSpan(21, 0, 0),
                RulesSummary = "No diving. Children under 14 must be supervised by an adult at all times. Shower before entering.",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new Amenity
            {
                Id = Guid.NewGuid(),
                PropertyId = property.Id,
                Name = "Private 4K Dolby Atmos Screening Cinema",
                Description = "Acoustically tuned 14-seat private theater with 150-inch 4K laser projection, plush motorized leather recliners, and Apple TV/HDMI inputs.",
                ImageUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
                Capacity = 14,
                OpenTime = new TimeSpan(9, 0, 0),
                CloseTime = new TimeSpan(23, 0, 0),
                RulesSummary = "Dispose of all food and drink containers in bins provided. Return AV receiver remote to charging dock upon exit.",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new Amenity
            {
                Id = Guid.NewGuid(),
                PropertyId = property.Id,
                Name = "High-Speed EV Supercharger Bay #1",
                Description = "Dedicated 50kW Level 3 DC Fast Charging stall compatible with all CCS and NACS/Tesla electric vehicles.",
                ImageUrl = "https://images.unsplash.com/photo-1558441719-8b489c63f736?auto=format&fit=crop&w=800&q=80",
                Capacity = 1,
                OpenTime = new TimeSpan(0, 0, 0),
                CloseTime = new TimeSpan(23, 59, 59),
                RulesSummary = "Maximum charging session is 2 hours. Move vehicle promptly after charging finishes to avoid idle parking penalties.",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };

        _context.Amenities.AddRange(list);
        await _context.SaveChangesAsync(ct);
    }
}

