using FluentValidation;
using SmartPropertyAI.Application.Features.Properties.DTOs;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Application.Features.Properties.Validators;

public class CreatePropertyRequestValidator : AbstractValidator<CreatePropertyRequest>
{
    public CreatePropertyRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Property name is required.")
            .MaximumLength(200).WithMessage("Property name must not exceed 200 characters.");

        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required.")
            .MaximumLength(500).WithMessage("Address must not exceed 500 characters.");

        RuleFor(x => x.City)
            .NotEmpty().WithMessage("City is required.")
            .MaximumLength(100).WithMessage("City must not exceed 100 characters.");

        RuleFor(x => x.Country)
            .NotEmpty().WithMessage("Country is required.")
            .MaximumLength(100).WithMessage("Country must not exceed 100 characters.");

        RuleFor(x => x.PropertyType)
            .NotEmpty().WithMessage("Property type is required.")
            .IsEnumName(typeof(PropertyType), caseSensitive: false)
            .WithMessage("Property type must be one of: Residential, Commercial, Mixed.");
    }
}

public class UpdatePropertyRequestValidator : AbstractValidator<UpdatePropertyRequest>
{
    public UpdatePropertyRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Property name is required.")
            .MaximumLength(200).WithMessage("Property name must not exceed 200 characters.");

        RuleFor(x => x.Address)
            .NotEmpty().WithMessage("Address is required.")
            .MaximumLength(500).WithMessage("Address must not exceed 500 characters.");

        RuleFor(x => x.City)
            .NotEmpty().WithMessage("City is required.")
            .MaximumLength(100).WithMessage("City must not exceed 100 characters.");

        RuleFor(x => x.Country)
            .NotEmpty().WithMessage("Country is required.")
            .MaximumLength(100).WithMessage("Country must not exceed 100 characters.");

        RuleFor(x => x.PropertyType)
            .NotEmpty().WithMessage("Property type is required.")
            .IsEnumName(typeof(PropertyType), caseSensitive: false)
            .WithMessage("Property type must be one of: Residential, Commercial, Mixed.");
    }
}

