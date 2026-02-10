using FluentValidation;
using SmartPropertyAI.Application.Features.Maintenance.DTOs;
using SmartPropertyAI.Domain.Enums;

namespace SmartPropertyAI.Application.Features.Maintenance.Validators;

public class CreateMaintenanceRequestValidator : AbstractValidator<CreateMaintenanceRequest>
{
    public CreateMaintenanceRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Description is required.")
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters.");

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Category is required.")
            .IsEnumName(typeof(MaintenanceCategory), caseSensitive: false)
            .WithMessage("Category must be one of: Plumbing, Electrical, Cleaning, Security, HVAC, Structural, Other.");

        RuleFor(x => x.Priority)
            .NotEmpty().WithMessage("Priority is required.")
            .IsEnumName(typeof(MaintenancePriority), caseSensitive: false)
            .WithMessage("Priority must be one of: Low, Medium, High, Urgent.");

        When(x => !string.IsNullOrEmpty(x.ImageUrl), () =>
        {
            RuleFor(x => x.ImageUrl)
                .MaximumLength(1000).WithMessage("Image URL must not exceed 1000 characters.");
        });
    }
}

public class UpdateMaintenanceRequestValidator : AbstractValidator<UpdateMaintenanceRequest>
{
    public UpdateMaintenanceRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Description is required.")
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters.");

        RuleFor(x => x.Priority)
            .NotEmpty().WithMessage("Priority is required.")
            .IsEnumName(typeof(MaintenancePriority), caseSensitive: false)
            .WithMessage("Priority must be one of: Low, Medium, High, Urgent.");
    }
}

public class UpdateMaintenanceStatusRequestValidator : AbstractValidator<UpdateMaintenanceStatusRequest>
{
    public UpdateMaintenanceStatusRequestValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty().WithMessage("Status is required.")
            .IsEnumName(typeof(MaintenanceStatus), caseSensitive: false)
            .WithMessage("Status must be a valid maintenance status.");
    }
}

public class AssignMaintenanceRequestValidator : AbstractValidator<AssignMaintenanceRequest>
{
    public AssignMaintenanceRequestValidator()
    {
        RuleFor(x => x.StaffId)
            .NotEmpty().WithMessage("StaffId is required.");
    }
}

public class AddMaintenanceNoteRequestValidator : AbstractValidator<AddMaintenanceNoteRequest>
{
    public AddMaintenanceNoteRequestValidator()
    {
        RuleFor(x => x.NoteText)
            .NotEmpty().WithMessage("Note text is required.")
            .MaximumLength(2000).WithMessage("Note text must not exceed 2000 characters.");
    }
}

