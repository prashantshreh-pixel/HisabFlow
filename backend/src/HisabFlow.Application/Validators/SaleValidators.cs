using FluentValidation;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Validators;

public class CreateSaleItemRequestValidator : AbstractValidator<CreateSaleItemRequest>
{
    public CreateSaleItemRequestValidator()
    {
        RuleFor(x => x.ProductId)
            .NotEmpty().WithMessage("Product ID is required.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Item quantity must be strictly greater than zero.");

        RuleFor(x => x.UnitPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Unit price cannot be negative.");

        RuleFor(x => x.CostPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Cost price cannot be negative.");

        RuleFor(x => x.Subtotal)
            .GreaterThanOrEqualTo(0).WithMessage("Item subtotal cannot be negative.");
    }
}

public class CreateSaleRequestValidator : AbstractValidator<CreateSaleRequest>
{
    public CreateSaleRequestValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Sale must contain at least one item.");

        RuleForEach(x => x.Items)
            .SetValidator(new CreateSaleItemRequestValidator());

        RuleFor(x => x.Subtotal)
            .GreaterThanOrEqualTo(0).WithMessage("Subtotal cannot be negative.");

        RuleFor(x => x.DiscountAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Discount amount cannot be negative.")
            .Must((req, discount) => discount <= req.Subtotal)
            .WithMessage("Discount amount cannot exceed item subtotal.");

        RuleFor(x => x.TaxAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Tax amount cannot be negative.");

        RuleFor(x => x.TotalAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Total amount cannot be negative.");

        RuleFor(x => x.CashPaid)
            .GreaterThanOrEqualTo(0).WithMessage("Cash payment cannot be negative.");

        RuleFor(x => x.DigitalPaid)
            .GreaterThanOrEqualTo(0).WithMessage("Digital payment cannot be negative.");

        RuleFor(x => x.CreditPaid)
            .GreaterThanOrEqualTo(0).WithMessage("Credit payment cannot be negative.")
            .Must((req, credit) => credit <= req.TotalAmount)
            .WithMessage("Credit amount cannot exceed total sale amount.");

        RuleFor(x => x)
            .Must(x => (x.CashPaid + x.DigitalPaid + x.CreditPaid) >= x.TotalAmount)
            .WithMessage("Total payments (cash + digital + credit) must cover total sale amount.");

        RuleFor(x => x.PaymentMethod)
            .InclusiveBetween(1, 4).WithMessage("Payment method must be Cash (1), Digital (2), Credit (3), or Split (4).");
    }
}
