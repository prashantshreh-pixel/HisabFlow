using FluentValidation;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Validators;

public class CreateCustomerRequestValidator : AbstractValidator<CreateCustomerRequest>
{
    public CreateCustomerRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Customer name is required.")
            .MaximumLength(100).WithMessage("Customer name cannot exceed 100 characters.");

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Phone number is required.")
            .Matches(@"^[0-9+\-\s]{7,15}$").WithMessage("Invalid phone number format.");

        RuleFor(x => x.CreditLimit)
            .GreaterThanOrEqualTo(0).WithMessage("Credit limit cannot be negative.");

        RuleFor(x => x.InitialBalance)
            .GreaterThanOrEqualTo(0).WithMessage("Initial balance cannot be negative.");

        RuleFor(x => x.Address)
            .MaximumLength(500).WithMessage("Address cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.Address));

        RuleFor(x => x.InitialNote)
            .MaximumLength(500).WithMessage("Initial note cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.InitialNote));
    }
}

public class RecordTransactionRequestValidator : AbstractValidator<RecordTransactionRequest>
{
    public RecordTransactionRequestValidator()
    {
        RuleFor(x => x.CustomerId)
            .NotEmpty().WithMessage("Customer ID is required.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Amount must be greater than zero.");

        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("Invalid transaction type.");

        RuleFor(x => x.PaymentMethod)
            .IsInEnum().WithMessage("Invalid payment method.");

        RuleFor(x => x.Particulars)
            .MaximumLength(500).WithMessage("Particulars cannot exceed 500 characters.")
            .When(x => !string.IsNullOrEmpty(x.Particulars));

        RuleFor(x => x.BillNumber)
            .MaximumLength(50).WithMessage("Bill number cannot exceed 50 characters.")
            .When(x => !string.IsNullOrEmpty(x.BillNumber));
    }
}
