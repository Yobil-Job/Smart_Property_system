using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Infrastructure.Persistence;

namespace SmartPropertyAI.Infrastructure.Identity;

public static class IdentityDataSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ApplicationUser>>();

        // Apply migrations with retry in case database container is still booting
        var retryCount = 5;
        while (retryCount > 0)
        {
            try
            {
                await dbContext.Database.MigrateAsync();
                await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE amenities ADD COLUMN IF NOT EXISTS deleted_by character varying(100); ALTER TABLE amenity_bookings ADD COLUMN IF NOT EXISTS deleted_by character varying(100);");
                break;
            }
            catch (Exception ex) when (retryCount > 1)
            {
                retryCount--;
                logger.LogWarning(ex, "Database migration attempt failed. Retrying in 4 seconds... ({AttemptsLeft} attempts remaining)", retryCount);
                await Task.Delay(4000);
            }
        }

        // 1. Seed Roles
        foreach (var roleName in UserRoles.AllRoles)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new ApplicationRole(roleName));
                logger.LogInformation("Seeded system role: {Role}", roleName);
            }
        }

        // 2. Seed Default Administrator
        await EnsureUserAsync(
            userManager,
            logger,
            email: "admin@smartproperty.ai",
            password: "AdminPassword123!",
            fullName: "System Administrator",
            role: UserRoles.Administrator
        );

        // 3. Seed Default Facility Staff
        await EnsureUserAsync(
            userManager,
            logger,
            email: "staff@smartproperty.ai",
            password: "StaffPassword123!",
            fullName: "Marcus Vance (Staff)",
            role: UserRoles.Staff
        );

        // 4. Seed Default Resident
        await EnsureUserAsync(
            userManager,
            logger,
            email: "resident@smartproperty.ai",
            password: "ResidentPassword123!",
            fullName: "Sarah Jenkins (Resident)",
            role: UserRoles.Resident
        );
    }

    private static async Task EnsureUserAsync(
        UserManager<ApplicationUser> userManager,
        ILogger logger,
        string email,
        string password,
        string fullName,
        string role)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = fullName,
                PhoneNumber = "+1 (555) 019-2834",
                EmailConfirmed = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var result = await userManager.CreateAsync(user, password);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, role);
                logger.LogInformation("Seeded default {Role} account: {Email}", role, email);
            }
            else
            {
                logger.LogError("Failed to seed {Role} ({Email}): {Errors}",
                    role, email, string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }
}
