using FluentValidation;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Validators;

public class CreatePaymentSessionRequestValidator : AbstractValidator<CreatePaymentSessionRequest>
{
    private static readonly HashSet<string> AllowedProviders = new(StringComparer.OrdinalIgnoreCase)
    {
        "FONEPAY", "KHALTI", "ESEWA"
    };

    public CreatePaymentSessionRequestValidator()
    {
        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Amount must be greater than 0.")
            .LessThanOrEqualTo(10_000_000m).WithMessage("Amount cannot exceed 10,000,000.");

        RuleFor(x => x.Provider)
            .NotEmpty().WithMessage("Payment provider is required.")
            .MaximumLength(20).WithMessage("Provider name cannot exceed 20 characters.")
            .Must(p => !string.IsNullOrWhiteSpace(p) && AllowedProviders.Contains(p.Trim()))
            .WithMessage("Unsupported payment provider.");

        RuleFor(x => x.InvoiceRef)
            .MaximumLength(50).WithMessage("Invoice reference cannot exceed 50 characters.")
            .When(x => !string.IsNullOrEmpty(x.InvoiceRef));
    }
}

public class PaymentCallbackRequestValidator : AbstractValidator<PaymentCallbackRequest>
{
    public PaymentCallbackRequestValidator()
    {
        RuleFor(x => x.Prn)
            .NotEmpty().WithMessage("Payment reference number (PRN) is required.")
            .MaximumLength(50).WithMessage("PRN cannot exceed 50 characters.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Amount must be greater than 0.")
            .LessThanOrEqualTo(10_000_000m).WithMessage("Amount cannot exceed 10,000,000.");

        RuleFor(x => x.TransactionId)
            .MaximumLength(100).WithMessage("Transaction ID cannot exceed 100 characters.")
            .When(x => !string.IsNullOrEmpty(x.TransactionId));

        RuleFor(x => x.Status)
            .NotEmpty().WithMessage("Status is required.")
            .MaximumLength(30).WithMessage("Status cannot exceed 30 characters.");
    }
}
