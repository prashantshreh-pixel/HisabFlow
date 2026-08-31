using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface ISaleRepository
{
    Task<SaleDto> CreateSaleAsync(CreateSaleRequest request, CancellationToken cancellationToken);
    Task<PagedResult<SaleDto>> GetPagedSalesAsync(int page, int pageSize, CancellationToken cancellationToken);
    Task<IReadOnlyList<SaleDto>> GetRecentSalesAsync(int count, CancellationToken cancellationToken);
    Task<SaleDto?> GetSaleByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<SaleDto?> GetSaleByInvoiceNumberAsync(string invoiceNumber, CancellationToken cancellationToken);
    Task<SalesSummaryDto> GetSalesSummaryAsync(DateTime? date, CancellationToken cancellationToken);
}
