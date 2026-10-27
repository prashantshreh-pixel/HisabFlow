namespace HisabFlow.Application.DTOs;

public record LoginRequest(
    string Username,
    string Password
);

public record VerifyUnlockRequest(
    string Password,
    string? Username = null
);

public record AuthUserDto(
    string Id,
    string Username,
    string DisplayName,
    string Role,
    string LoginTime
);

public record LoginResponse(
    string Token,
    AuthUserDto User
);
