using FluentValidation;
using SmartPropertyAI.Application.Features.Users.DTOs;
using SmartPropertyAI.Domain.Constants;

namespace SmartPropertyAI.Application.Features.Users.Validators;

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequestDto>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full Name is required.")
            .MaximumLength(150);

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.");

        RuleFor(x => x.InitialPassword)
            .NotEmpty().WithMessage("Initial password is required.")
            .MinimumLength(8);

        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Role is required.")
            .Must(r => UserRoles.AllRoles.Contains(r))
            .WithMessage($"Role must be one of: {string.Join(", ", UserRoles.AllRoles)}");
    }
}

public class UpdateUserRoleRequestValidator : AbstractValidator<UpdateUserRoleRequestDto>
{
    public UpdateUserRoleRequestValidator()
    {
        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Role is required.")
            .Must(r => UserRoles.AllRoles.Contains(r))
            .WithMessage($"Role must be one of: {string.Join(", ", UserRoles.AllRoles)}");
    }
}

