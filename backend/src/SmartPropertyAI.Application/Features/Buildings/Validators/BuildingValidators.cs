using FluentValidation;
using SmartPropertyAI.Application.Features.Buildings.DTOs;

namespace SmartPropertyAI.Application.Features.Buildings.Validators;

public class CreateBuildingRequestValidator : AbstractValidator<CreateBuildingRequest>
{
    public CreateBuildingRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Building name is required.")
            .MaximumLength(100).WithMessage("Building name must not exceed 100 characters.");

        RuleFor(x => x.FloorCount)
            .GreaterThan(0).WithMessage("Floor count must be at least 1.");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description must not exceed 1000 characters.");
    }
}

public class UpdateBuildingRequestValidator : AbstractValidator<UpdateBuildingRequest>
{
    public UpdateBuildingRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Building name is required.")
            .MaximumLength(100).WithMessage("Building name must not exceed 100 characters.");

        RuleFor(x => x.FloorCount)
            .GreaterThan(0).WithMessage("Floor count must be at least 1.");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description must not exceed 1000 characters.");
    }
}

