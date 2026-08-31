using HisabFlow.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Manages database backups and snapshot exports.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class BackupController : ControllerBase
{
    private readonly IBackupService _backupService;

    public BackupController(IBackupService backupService)
    {
        _backupService = backupService;
    }

    /// <summary>
    /// Creates an immediate database backup snapshot.
    /// </summary>
    [HttpPost("create")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<DatabaseBackupResult>> CreateBackup(CancellationToken cancellationToken = default)
    {
        var result = await _backupService.CreateBackupAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lists all existing database backups.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<DatabaseBackupResult>>> ListBackups(CancellationToken cancellationToken = default)
    {
        var backups = await _backupService.ListBackupsAsync(cancellationToken);
        return Ok(backups);
    }
}
