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

        RuleFor(x => x.Category)
            .MaximumLength(100).WithMessage("Category cannot exceed 100 characters.")
            .When(x => !string.IsNullOrEmpty(x.Category));

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Valid positive expense amount is required.");

        RuleFor(x => x.Particulars)
            .MaximumLength(1000).WithMessage("Particulars cannot exceed 1000 characters.")
            .When(x => !string.IsNullOrEmpty(x.Particulars));
    }
}
