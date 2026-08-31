using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace HisabFlow.Infrastructure.Repositories;

public class CachedReportRepository : IReportRepository
{
    private readonly IReportRepository _innerRepository;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan DefaultCacheDuration = TimeSpan.FromMinutes(2);

    public CachedReportRepository(IReportRepository innerRepository, IMemoryCache cache)
    {
        _innerRepository = innerRepository;
        _cache = cache;
    }

    public async Task<ProfitLossReportDto> GetProfitLossReportAsync(
        DateTime startDate,
        DateTime endDate,
        string periodName = "Custom",
        CancellationToken cancellationToken = default)
    {
        string cacheKey = $"report_profit_loss_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}_{periodName}";

        if (_cache.TryGetValue(cacheKey, out ProfitLossReportDto? cachedReport) && cachedReport != null)
        {
            return cachedReport;
        }

        var report = await _innerRepository.GetProfitLossReportAsync(startDate, endDate, periodName, cancellationToken);
        
        _cache.Set(cacheKey, report, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = DefaultCacheDuration
        });

        return report;
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(CancellationToken cancellationToken = default)
    {
        string cacheKey = $"report_dashboard_summary_{DateTime.UtcNow:yyyyMMdd_HHmm}";

        if (_cache.TryGetValue(cacheKey, out DashboardSummaryDto? cachedSummary) && cachedSummary != null)
        {
            return cachedSummary;
        }

        var summary = await _innerRepository.GetDashboardSummaryAsync(cancellationToken);

        _cache.Set(cacheKey, summary, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
        });

        return summary;
    }

    public void InvalidateCache()
    {
        if (_cache is MemoryCache memoryCache)
        {
            memoryCache.Compact(1.0);
        }
    }
}
