using FluentValidation;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Validators;

public class CreateExpenseRequestValidator : AbstractValidator<CreateExpenseRequest>
{
    public CreateExpenseRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Expense title is required.")
            .MaximumLength(200).WithMessage("Expense title cannot exceed 200 characters.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Valid positive expense amount is required.");
    }
}
