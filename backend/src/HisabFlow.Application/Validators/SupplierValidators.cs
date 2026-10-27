using FluentValidation;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Validators;

public class CreateSupplierApiRequestValidator : AbstractValidator<CreateSupplierApiRequest>
{
    public CreateSupplierApiRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Supplier name is required.")
            .MaximumLength(100).WithMessage("Supplier name cannot exceed 100 characters.");

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Phone number is required.")
            .Matches(@"^[0-9+\-\s]{7,15}$").WithMessage("Invalid phone number format.");

        RuleFor(x => x.CompanyName)
            .MaximumLength(150).WithMessage("Company name cannot exceed 150 characters.")
            .When(x => !string.IsNullOrEmpty(x.CompanyName));

        RuleFor(x => x.Address)
            .MaximumLength(500).WithMessage("Address cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.Address));

        RuleFor(x => x.InitialNote)
            .MaximumLength(500).WithMessage("Initial note cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.InitialNote));
    }
}

public class UpdateSupplierApiRequestValidator : AbstractValidator<UpdateSupplierApiRequest>
{
    public UpdateSupplierApiRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Supplier name is required.")
            .MaximumLength(100).WithMessage("Supplier name cannot exceed 100 characters.");

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Phone number is required.")
            .Matches(@"^[0-9+\-\s]{7,15}$").WithMessage("Invalid phone number format.");

        RuleFor(x => x.CompanyName)
            .MaximumLength(150).WithMessage("Company name cannot exceed 150 characters.")
            .When(x => !string.IsNullOrEmpty(x.CompanyName));

        RuleFor(x => x.Address)
            .MaximumLength(500).WithMessage("Address cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.Address));
    }
}

public class RecordSupplierTransactionRequestValidator : AbstractValidator<RecordSupplierTransactionRequest>
{
    public RecordSupplierTransactionRequestValidator()
    {
        RuleFor(x => x.SupplierId)
            .NotEmpty().WithMessage("Supplier ID is required.");

        RuleFor(x => x.Type)
            .InclusiveBetween(1, 2).WithMessage("Transaction type must be Stock Purchase (1) or Payment Given (2).");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Transaction amount must be greater than zero.");

        RuleFor(x => x.PaymentMethod)
            .IsInEnum().WithMessage("Invalid payment method.");

        RuleFor(x => x.Particulars)
            .MaximumLength(500).WithMessage("Particulars cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.Particulars));

        RuleFor(x => x.InvoiceNumber)
            .MaximumLength(50).WithMessage("Invoice number cannot exceed 50 characters.")
            .When(x => !string.IsNullOrEmpty(x.InvoiceNumber));
    }
}
