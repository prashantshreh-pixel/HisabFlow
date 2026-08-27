using HisabFlow.Application.Reports.DTOs;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface IReportRepository
{
    Task<ProfitLossReportDto> GetProfitLossReportAsync(DateTime startDate, DateTime endDate, string periodName = "Custom");
}
