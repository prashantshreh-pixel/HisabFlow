using HisabFlow.Application.Sales.DTOs;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface ISaleRepository
{
    Task<SaleDto> CreateSaleAsync(CreateSaleRequest request);
    Task<IReadOnlyList<SaleDto>> GetRecentSalesAsync(int count = 50);
    Task<SaleDto?> GetSaleByIdAsync(Guid id);
    Task<SaleDto?> GetSaleByInvoiceNumberAsync(string invoiceNumber);
    Task<SalesSummaryDto> GetSalesSummaryAsync(DateTime? date = null);
}
