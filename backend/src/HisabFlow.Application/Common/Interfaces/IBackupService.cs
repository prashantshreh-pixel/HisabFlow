namespace HisabFlow.Application.Common.Interfaces;

public record DatabaseBackupResult(
    string BackupFileName,
    string BackupPath,
    long SizeInBytes,
    DateTime CreatedAt
);

public interface IBackupService
{
    Task<DatabaseBackupResult> CreateBackupAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<DatabaseBackupResult>> ListBackupsAsync(CancellationToken cancellationToken = default);
}
