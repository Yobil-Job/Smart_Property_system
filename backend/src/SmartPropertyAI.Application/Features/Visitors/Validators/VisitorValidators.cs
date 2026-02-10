using FluentValidation;
using SmartPropertyAI.Application.Features.Visitors.DTOs;

namespace SmartPropertyAI.Application.Features.Visitors.Validators;

public class CreateVisitorRequestValidator : AbstractValidator<CreateVisitorRequest>
{
    public CreateVisitorRequestValidator()
    {
        RuleFor(x => x.VisitorName)
            .NotEmpty().WithMessage("Visitor name is required.")
            .MaximumLength(200).WithMessage("Visitor name must not exceed 200 characters.");

        RuleFor(x => x.VisitorPhone)
            .NotEmpty().WithMessage("Visitor phone number is required.")
            .MaximumLength(50).WithMessage("Visitor phone number must not exceed 50 characters.");

        RuleFor(x => x.Purpose)
            .NotEmpty().WithMessage("Purpose is required.")
            .MaximumLength(200).WithMessage("Purpose must not exceed 200 characters.");

        RuleFor(x => x.ExpectedArrival)
            .NotEmpty().WithMessage("Expected arrival is required.");

        RuleFor(x => x.ExpectedDeparture)
            .NotEmpty().WithMessage("Expected departure is required.")
            .GreaterThan(x => x.ExpectedArrival)
            .WithMessage("Expected departure must be after expected arrival.");
    }
}

public class UpdateVisitorRequestValidator : AbstractValidator<UpdateVisitorRequest>
{
    public UpdateVisitorRequestValidator()
    {
        RuleFor(x => x.VisitorName)
            .NotEmpty().WithMessage("Visitor name is required.")
            .MaximumLength(200).WithMessage("Visitor name must not exceed 200 characters.");

        RuleFor(x => x.VisitorPhone)
            .NotEmpty().WithMessage("Visitor phone number is required.")
            .MaximumLength(50).WithMessage("Visitor phone number must not exceed 50 characters.");

        RuleFor(x => x.Purpose)
            .NotEmpty().WithMessage("Purpose is required.")
            .MaximumLength(200).WithMessage("Purpose must not exceed 200 characters.");

        RuleFor(x => x.ExpectedArrival)
            .NotEmpty().WithMessage("Expected arrival is required.");

        RuleFor(x => x.ExpectedDeparture)
            .NotEmpty().WithMessage("Expected departure is required.")
            .GreaterThan(x => x.ExpectedArrival)
            .WithMessage("Expected departure must be after expected arrival.");
    }
}

