using FluentValidation;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Validators;

public class RecordSupplierTransactionRequestValidator : AbstractValidator<RecordSupplierTransactionRequest>
{
    public RecordSupplierTransactionRequestValidator()
    {
        RuleFor(x => x.SupplierId)
            .NotEmpty().WithMessage("Supplier ID is required.");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Transaction amount must be greater than zero.");
    }
}
