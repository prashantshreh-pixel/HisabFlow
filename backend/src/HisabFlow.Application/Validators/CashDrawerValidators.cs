using FluentValidation;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Validators;

public class OpenCashDrawerShiftRequestValidator : AbstractValidator<OpenCashDrawerShiftRequest>
{
    public OpenCashDrawerShiftRequestValidator()
    {
        RuleFor(x => x.OpeningCash)
            .GreaterThanOrEqualTo(0).WithMessage("Opening cash balance cannot be negative.");
    }
}

public class CloseCashDrawerShiftRequestValidator : AbstractValidator<CloseCashDrawerShiftRequest>
{
    public CloseCashDrawerShiftRequestValidator()
    {
        RuleFor(x => x.ActualCash)
            .GreaterThanOrEqualTo(0).WithMessage("Actual cash balance cannot be negative.");
    }
}
