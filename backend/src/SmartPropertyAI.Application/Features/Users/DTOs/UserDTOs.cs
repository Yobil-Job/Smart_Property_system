namespace SmartPropertyAI.Application.Features.Users.DTOs;

public class UserSummaryDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class UserDetailDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public IList<string> Roles { get; set; } = new List<string>();
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class CreateUserRequestDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string InitialPassword { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public class UpdateUserRequestDto
{
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
}

public class UpdateUserStatusRequestDto
{
    public bool IsActive { get; set; }
    public string? Reason { get; set; }
}

public class UpdateUserRoleRequestDto
{
    public string Role { get; set; } = string.Empty;
}

public class UserFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? SearchTerm { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
}

