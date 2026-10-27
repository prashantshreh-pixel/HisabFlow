using FluentValidation;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username is required.")
            .MaximumLength(50).WithMessage("Username cannot exceed 50 characters.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MaximumLength(128).WithMessage("Password cannot exceed 128 characters.");
    }
}

public class VerifyUnlockRequestValidator : AbstractValidator<VerifyUnlockRequest>
{
    public VerifyUnlockRequestValidator()
    {
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password or PIN is required.")
            .MaximumLength(128).WithMessage("Password cannot exceed 128 characters.");
    }
}
