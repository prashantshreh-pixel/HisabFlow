using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface ICashDrawerRepository
{
    Task<CashDrawerShiftDto?> GetCurrentOpenShiftAsync(CancellationToken cancellationToken = default);
    Task<CashDrawerShiftDto> OpenShiftAsync(OpenCashDrawerShiftRequest request, CancellationToken cancellationToken = default);
    Task<CashDrawerShiftDto> CloseShiftAsync(CloseCashDrawerShiftRequest request, CancellationToken cancellationToken = default);
    Task<IEnumerable<CashDrawerShiftDto>> GetShiftHistoryAsync(int limit = 30, CancellationToken cancellationToken = default);
}
