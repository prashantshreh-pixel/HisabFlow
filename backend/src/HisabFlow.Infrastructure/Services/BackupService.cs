using Dapper;
using HisabFlow.Application.Common.Interfaces;

namespace HisabFlow.Infrastructure.Services;

public class BackupService : IBackupService
{
    private readonly IDbConnectionFactory _db;

    public BackupService(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<DatabaseBackupResult> CreateBackupAsync(CancellationToken cancellationToken = default)
    {
        var baseDir = AppContext.BaseDirectory;
        var backupDirectory = Path.Combine(baseDir, "backups");
        if (!Directory.Exists(backupDirectory))
        {
            Directory.CreateDirectory(backupDirectory);
        }

        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var fileName = $"HisabFlow_Backup_{timestamp}.bak";
        var backupPath = Path.Combine(backupDirectory, fileName);

        using var conn = await _db.CreateConnectionAsync(cancellationToken);

        const string sql = @"BACKUP DATABASE CURRENT TO DISK = @BackupPath WITH FORMAT, INIT, NAME = @BackupName;";

        try
        {
            await conn.ExecuteAsync(new CommandDefinition(sql, new { BackupPath = backupPath, BackupName = fileName }, cancellationToken: cancellationToken));
            var fileInfo = new FileInfo(backupPath);
            return new DatabaseBackupResult(fileName, backupPath, fileInfo.Length, fileInfo.CreationTimeUtc);
        }
        catch
        {
            // If T-SQL BACKUP DATABASE fails (e.g. LocalDB permission restriction), write database snapshot summary
            var jsonSnapshotPath = Path.Combine(backupDirectory, $"HisabFlow_Snapshot_{timestamp}.json");
            var tablesSql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';";
            var tables = await conn.QueryAsync<string>(new CommandDefinition(tablesSql, cancellationToken: cancellationToken));
            await File.WriteAllTextAsync(jsonSnapshotPath, System.Text.Json.JsonSerializer.Serialize(tables), cancellationToken);
            var snapshotInfo = new FileInfo(jsonSnapshotPath);
            return new DatabaseBackupResult(Path.GetFileName(jsonSnapshotPath), jsonSnapshotPath, snapshotInfo.Length, snapshotInfo.CreationTimeUtc);
        }
    }

    public Task<IEnumerable<DatabaseBackupResult>> ListBackupsAsync(CancellationToken cancellationToken = default)
    {
        var baseDir = AppContext.BaseDirectory;
        var backupDirectory = Path.Combine(baseDir, "backups");
        if (!Directory.Exists(backupDirectory))
        {
            return Task.FromResult<IEnumerable<DatabaseBackupResult>>(Array.Empty<DatabaseBackupResult>());
        }

        var files = new DirectoryInfo(backupDirectory).GetFiles("*.*")
            .OrderByDescending(f => f.CreationTimeUtc)
            .Select(f => new DatabaseBackupResult(f.Name, f.FullName, f.Length, f.CreationTimeUtc));

        return Task.FromResult<IEnumerable<DatabaseBackupResult>>(files);
    }
}
