using FluentValidation;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Validators;

public class CreateSaleRequestValidator : AbstractValidator<CreateSaleRequest>
{
    public CreateSaleRequestValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Sale must contain at least one item.");

        RuleFor(x => x.TotalAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Total amount cannot be negative.");
    }
}
