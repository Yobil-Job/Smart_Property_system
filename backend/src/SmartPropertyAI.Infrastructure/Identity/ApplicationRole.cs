using Microsoft.AspNetCore.Identity;

namespace SmartPropertyAI.Infrastructure.Identity;

public class ApplicationRole : IdentityRole<Guid>
{
    public ApplicationRole()
    {
        Id = Guid.NewGuid();
    }

    public ApplicationRole(string roleName) : base(roleName)
    {
        Id = Guid.NewGuid();
    }
}

