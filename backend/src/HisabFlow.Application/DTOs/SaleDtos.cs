namespace HisabFlow.Application.DTOs;

public record SaleItemDto(
    Guid Id,
    Guid SaleId,
    Guid ProductId,
    string ProductName,
    string Unit,
    decimal UnitPrice,
    decimal CostPrice,
    decimal Quantity,
    decimal Subtotal,
    DateTime CreatedAt
);

public record SaleDto(
    Guid Id,
    string InvoiceNumber,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal ChangeAmount,
    int PaymentMethod,
    decimal CashPaid,
    decimal DigitalPaid,
    decimal CreditPaid,
    string? Notes,
    bool IsRefunded,
    DateTime? RefundedAt,
    DateTime SaleDate,
    DateTime CreatedAt,
    IReadOnlyList<SaleItemDto> Items
);

public record CreateSaleItemRequest(
    Guid ProductId,
    string ProductName,
    string Unit,
    decimal UnitPrice,
    decimal CostPrice,
    decimal Quantity,
    decimal Subtotal
);

public record CreateSaleRequest(
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal ChangeAmount,
    int PaymentMethod,
    decimal CashPaid,
    decimal DigitalPaid,
    decimal CreditPaid,
    string? Notes,
    DateTime? SaleDate,
    List<CreateSaleItemRequest> Items
);

public record SalesSummaryDto(
    DateTime Date,
    decimal TotalSalesAmount,
    int TotalBillsCount,
    decimal CashSalesAmount,
    decimal DigitalSalesAmount,
    decimal CreditSalesAmount,
    int TotalItemsSold
);
