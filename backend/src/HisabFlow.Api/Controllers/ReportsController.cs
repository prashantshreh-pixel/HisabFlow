using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

[ApiController]
[Route("api/v1/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportRepository _reportRepository;

    public ReportsController(IReportRepository reportRepository)
    {
        _reportRepository = reportRepository;
    }

    /// <summary>
    /// Generates a comprehensive Profit & Loss (P&L) statement and retail financial report.
    /// </summary>
    [HttpGet("profit-loss")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<ProfitLossReportDto>> GetProfitLoss(
        [FromQuery] string period = "this_month",
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        DateTime from;
        DateTime to;
        string periodTitle;

        switch (period.ToLowerInvariant())
        {
            case "today":
                from = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
                to = new DateTime(now.Year, now.Month, now.Day, 23, 59, 59, DateTimeKind.Utc);
                periodTitle = "Today";
                break;

            case "yesterday":
                var yesterday = now.AddDays(-1);
                from = new DateTime(yesterday.Year, yesterday.Month, yesterday.Day, 0, 0, 0, DateTimeKind.Utc);
                to = new DateTime(yesterday.Year, yesterday.Month, yesterday.Day, 23, 59, 59, DateTimeKind.Utc);
                periodTitle = "Yesterday";
                break;

            case "this_week":
                int diff = (7 + (now.DayOfWeek - DayOfWeek.Monday)) % 7;
                var monday = now.AddDays(-1 * diff);
                from = new DateTime(monday.Year, monday.Month, monday.Day, 0, 0, 0, DateTimeKind.Utc);
                to = new DateTime(now.Year, now.Month, now.Day, 23, 59, 59, DateTimeKind.Utc);
                periodTitle = "This Week";
                break;

            case "last_month":
                var firstDayOfCurrentMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var lastDayOfLastMonth = firstDayOfCurrentMonth.AddDays(-1);
                from = new DateTime(lastDayOfLastMonth.Year, lastDayOfLastMonth.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                to = new DateTime(lastDayOfLastMonth.Year, lastDayOfLastMonth.Month, lastDayOfLastMonth.Day, 23, 59, 59, DateTimeKind.Utc);
                periodTitle = "Last Month";
                break;

            case "this_year":
                from = new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                to = new DateTime(now.Year, 12, 31, 23, 59, 59, DateTimeKind.Utc);
                periodTitle = $"Year {now.Year}";
                break;

            case "custom":
                from = startDate ?? new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                to = endDate ?? new DateTime(now.Year, now.Month, now.Day, 23, 59, 59, DateTimeKind.Utc);
                if (to < from)
                {
                    var temp = from;
                    from = to;
                    to = temp;
                }
                to = new DateTime(to.Year, to.Month, to.Day, 23, 59, 59, DateTimeKind.Utc);
                periodTitle = $"{from:dd MMM yyyy} - {to:dd MMM yyyy}";
                break;

            case "this_month":
            default:
                from = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                to = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month), 23, 59, 59, DateTimeKind.Utc);
                periodTitle = "This Month";
                break;
        }

        var report = await _reportRepository.GetProfitLossReportAsync(from, to, periodTitle, cancellationToken);
        return Ok(report);
    }
}
