using FluentValidation;
using SmartPropertyAI.Application.Features.Residents.DTOs;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Application.Features.Residents.Validators;

public class CreateResidentRequestValidator : AbstractValidator<CreateResidentRequest>
{
    public CreateResidentRequestValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User ID is required.");

        RuleFor(x => x.ApartmentId)
            .NotEmpty().WithMessage("Apartment ID is required.");

        RuleFor(x => x.EmergencyContact)
            .MaximumLength(500).WithMessage("Emergency contact must not exceed 500 characters.");
    }
}

public class UpdateResidentRequestValidator : AbstractValidator<UpdateResidentRequest>
{
    public UpdateResidentRequestValidator()
    {
        RuleFor(x => x.EmergencyContact)
            .MaximumLength(500).WithMessage("Emergency contact must not exceed 500 characters.");

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(50).WithMessage("Phone number must not exceed 50 characters.");

        RuleFor(x => x.FullName)
            .MaximumLength(200).WithMessage("Full name must not exceed 200 characters.");

        When(x => !string.IsNullOrEmpty(x.Status), () =>
        {
            RuleFor(x => x.Status)
                .IsEnumName(typeof(ResidentStatus), caseSensitive: false)
                .WithMessage("Status must be one of: Active, PendingMoveIn, Inactive.");
        });
    }
}

