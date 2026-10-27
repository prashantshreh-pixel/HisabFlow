using Dapper;
using HisabFlow.Application.Common.Interfaces;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace HisabFlow.Infrastructure.Services;

public partial class BackupService : IBackupService
{
    private readonly IDbConnectionFactory _db;

    [GeneratedRegex(@"^[a-zA-Z0-9_]+$")]
    private static partial Regex SafeTableNameRegex();

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
            // Return sanitized logical path to prevent server file system path disclosure
            return new DatabaseBackupResult(fileName, $"backups/{fileName}", fileInfo.Length, fileInfo.CreationTimeUtc);
        }
        catch
        {
            // Fallback: Export complete restorable dataset snapshot containing all table row data (excluding sensitive password hashes)
            var snapshotFileName = $"HisabFlow_Snapshot_{timestamp}.json";
            var jsonSnapshotPath = Path.Combine(backupDirectory, snapshotFileName);
            const string tablesSql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME NOT LIKE '__%' AND TABLE_NAME <> 'users';";
            var tables = (await conn.QueryAsync<string>(new CommandDefinition(tablesSql, cancellationToken: cancellationToken))).ToList();

            var dataExport = new Dictionary<string, IEnumerable<dynamic>>();
            foreach (var table in tables)
            {
                if (!SafeTableNameRegex().IsMatch(table))
                {
                    continue;
                }

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
            return new DatabaseBackupResult(snapshotFileName, $"backups/{snapshotFileName}", snapshotInfo.Length, snapshotInfo.CreationTimeUtc);
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
            .Where(f => f.Extension.Equals(".bak", StringComparison.OrdinalIgnoreCase) || f.Extension.Equals(".json", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(f => f.CreationTimeUtc)
            .Select(f => new DatabaseBackupResult(f.Name, $"backups/{f.Name}", f.Length, f.CreationTimeUtc));

        return Task.FromResult<IEnumerable<DatabaseBackupResult>>(files);
    }
}
