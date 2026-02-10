using FluentValidation;
using SmartPropertyAI.Application.Features.Apartments.DTOs;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Application.Features.Apartments.Validators;

public class CreateApartmentRequestValidator : AbstractValidator<CreateApartmentRequest>
{
    public CreateApartmentRequestValidator()
    {
        RuleFor(x => x.ApartmentNumber)
            .NotEmpty().WithMessage("Apartment number is required.")
            .MaximumLength(50).WithMessage("Apartment number must not exceed 50 characters.");

        RuleFor(x => x.Floor)
            .GreaterThanOrEqualTo(0).WithMessage("Floor must be 0 (ground) or higher.");

        RuleFor(x => x.NumberOfBedrooms)
            .GreaterThanOrEqualTo(0).WithMessage("Number of bedrooms cannot be negative.");

        RuleFor(x => x.NumberOfBathrooms)
            .GreaterThanOrEqualTo(0).WithMessage("Number of bathrooms cannot be negative.");
    }
}

public class UpdateApartmentRequestValidator : AbstractValidator<UpdateApartmentRequest>
{
    public UpdateApartmentRequestValidator()
    {
        RuleFor(x => x.ApartmentNumber)
            .NotEmpty().WithMessage("Apartment number is required.")
            .MaximumLength(50).WithMessage("Apartment number must not exceed 50 characters.");

        RuleFor(x => x.Floor)
            .GreaterThanOrEqualTo(0).WithMessage("Floor must be 0 (ground) or higher.");

        RuleFor(x => x.NumberOfBedrooms)
            .GreaterThanOrEqualTo(0).WithMessage("Number of bedrooms cannot be negative.");

        RuleFor(x => x.NumberOfBathrooms)
            .GreaterThanOrEqualTo(0).WithMessage("Number of bathrooms cannot be negative.");
    }
}

public class UpdateOccupancyRequestValidator : AbstractValidator<UpdateOccupancyRequest>
{
    public UpdateOccupancyRequestValidator()
    {
        RuleFor(x => x.OccupancyStatus)
            .NotEmpty().WithMessage("Occupancy status is required.")
            .IsEnumName(typeof(OccupancyStatus), caseSensitive: false)
            .WithMessage("Occupancy status must be one of: Vacant, Occupied, UnderMaintenance, Reserved.");
    }
}

