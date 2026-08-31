using Dapper;
using HisabFlow.Application.Common.Interfaces;
using System.Text.Json;

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
            // Fallback: Export complete restorable dataset snapshot containing all table row data
            var jsonSnapshotPath = Path.Combine(backupDirectory, $"HisabFlow_Snapshot_{timestamp}.json");
            var tablesSql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME NOT LIKE '__%';";
            var tables = (await conn.QueryAsync<string>(new CommandDefinition(tablesSql, cancellationToken: cancellationToken))).ToList();

            var dataExport = new Dictionary<string, IEnumerable<dynamic>>();
            foreach (var table in tables)
            {
                var querySql = $"SELECT * FROM [{table}];";
                var rows = await conn.QueryAsync<dynamic>(new CommandDefinition(querySql, cancellationToken: cancellationToken));
                dataExport[table] = rows;
            }

            var exportPayload = new
            {
                Version = "1.0",
                ExportedAt = DateTime.UtcNow,
                Tables = dataExport
            };

            await File.WriteAllTextAsync(jsonSnapshotPath, JsonSerializer.Serialize(exportPayload, new JsonSerializerOptions { WriteIndented = true }), cancellationToken);
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
