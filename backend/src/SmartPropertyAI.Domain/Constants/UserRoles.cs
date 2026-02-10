namespace SmartPropertyAI.Domain.Constants;

public static class UserRoles
{
    public const string Administrator = "Administrator";
    public const string Staff = "Staff";
    public const string Resident = "Resident";

    public static readonly IReadOnlyList<string> AllRoles = new[]
    {
        Administrator,
        Staff,
        Resident
    };
}

