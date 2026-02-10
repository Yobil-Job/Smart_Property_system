using FluentValidation;
using SmartPropertyAI.Application.Features.Staff.DTOs;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Application.Features.Staff.Validators;

public class CreateStaffRequestValidator : AbstractValidator<CreateStaffRequest>
{
    public CreateStaffRequestValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User ID is required.");

        RuleFor(x => x.PropertyId)
            .NotEmpty().WithMessage("Property ID is required.");

        RuleFor(x => x.EmployeeNumber)
            .NotEmpty().WithMessage("Employee number is required.")
            .MaximumLength(50).WithMessage("Employee number must not exceed 50 characters.");

        RuleFor(x => x.Position)
            .NotEmpty().WithMessage("Position is required.")
            .MaximumLength(100).WithMessage("Position must not exceed 100 characters.");
    }
}

public class UpdateStaffRequestValidator : AbstractValidator<UpdateStaffRequest>
{
    public UpdateStaffRequestValidator()
    {
        When(x => !string.IsNullOrEmpty(x.Position), () =>
        {
            RuleFor(x => x.Position)
                .MaximumLength(100).WithMessage("Position must not exceed 100 characters.");
        });

        When(x => !string.IsNullOrEmpty(x.EmploymentStatus), () =>
        {
            RuleFor(x => x.EmploymentStatus)
                .IsEnumName(typeof(EmploymentStatus), caseSensitive: false)
                .WithMessage("Employment status must be one of: Active, OnLeave, Terminated.");
        });
    }
}

