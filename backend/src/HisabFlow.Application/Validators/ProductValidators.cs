using FluentValidation;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Validators;

public class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Product name is required.")
            .MaximumLength(200).WithMessage("Product name cannot exceed 200 characters.");

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Product category is required.")
            .MaximumLength(100).WithMessage("Category cannot exceed 100 characters.");

        RuleFor(x => x.Unit)
            .NotEmpty().WithMessage("Product unit is required.")
            .MaximumLength(20).WithMessage("Unit cannot exceed 20 characters.");

        RuleFor(x => x.CostPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Cost price cannot be negative.");

        RuleFor(x => x.SellingPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Selling price cannot be negative.");

        RuleFor(x => x.StockQuantity)
            .GreaterThanOrEqualTo(0).WithMessage("Initial stock quantity cannot be negative.");

        RuleFor(x => x.MinStockAlert)
            .GreaterThanOrEqualTo(0).WithMessage("Minimum stock alert cannot be negative.");

        RuleFor(x => x.Barcode)
            .MaximumLength(50).WithMessage("Barcode cannot exceed 50 characters.")
            .When(x => !string.IsNullOrEmpty(x.Barcode));

        RuleFor(x => x.ImageUrl)
            .MaximumLength(500).WithMessage("Image URL cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.ImageUrl));

        RuleFor(x => x.Brand)
            .MaximumLength(100).WithMessage("Brand cannot exceed 100 characters.")
            .When(x => !string.IsNullOrEmpty(x.Brand));

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.Description));
    }
}

public class UpdateProductRequestValidator : AbstractValidator<UpdateProductRequest>
{
    public UpdateProductRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Product name is required.")
            .MaximumLength(200).WithMessage("Product name cannot exceed 200 characters.");

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Product category is required.")
            .MaximumLength(100).WithMessage("Category cannot exceed 100 characters.");

        RuleFor(x => x.Unit)
            .NotEmpty().WithMessage("Product unit is required.")
            .MaximumLength(20).WithMessage("Unit cannot exceed 20 characters.");

        RuleFor(x => x.CostPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Cost price cannot be negative.");

        RuleFor(x => x.SellingPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Selling price cannot be negative.");

        RuleFor(x => x.StockQuantity)
            .GreaterThanOrEqualTo(0).WithMessage("Stock quantity cannot be negative.");

        RuleFor(x => x.MinStockAlert)
            .GreaterThanOrEqualTo(0).WithMessage("Minimum stock alert cannot be negative.");

        RuleFor(x => x.Barcode)
            .MaximumLength(50).WithMessage("Barcode cannot exceed 50 characters.")
            .When(x => !string.IsNullOrEmpty(x.Barcode));

        RuleFor(x => x.ImageUrl)
            .MaximumLength(500).WithMessage("Image URL cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.ImageUrl));

        RuleFor(x => x.Brand)
            .MaximumLength(100).WithMessage("Brand cannot exceed 100 characters.")
            .When(x => !string.IsNullOrEmpty(x.Brand));

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.Description));
    }
}

public class StockAdjustmentPayloadValidator : AbstractValidator<StockAdjustmentPayload>
{
    public StockAdjustmentPayloadValidator()
    {
        RuleFor(x => x.QuantityChange)
            .NotEqual(0).WithMessage("Quantity change cannot be zero.")
            .InclusiveBetween(-1_000_000m, 1_000_000m).WithMessage("Quantity change must be between -1,000,000 and 1,000,000.");

        RuleFor(x => x.Notes)
            .MaximumLength(256).WithMessage("Adjustment notes cannot exceed 256 characters.")
            .When(x => !string.IsNullOrEmpty(x.Notes));
    }
}
