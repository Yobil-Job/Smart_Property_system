using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.Amenities;
using SmartPropertyAI.Application.Features.Analytics;
using SmartPropertyAI.Application.Features.Apartments;
using SmartPropertyAI.Application.Features.AuditLogs;
using SmartPropertyAI.Application.Features.Buildings;
using SmartPropertyAI.Application.Features.Conversations;
using SmartPropertyAI.Application.Features.Dashboard;
using SmartPropertyAI.Application.Features.Maintenance;
using SmartPropertyAI.Application.Features.Notifications;
using SmartPropertyAI.Application.Features.Properties;
using SmartPropertyAI.Application.Features.Residents;
using SmartPropertyAI.Application.Features.Staff;
using SmartPropertyAI.Application.Features.Visitors;
using SmartPropertyAI.Application.Interfaces;
using SmartPropertyAI.Infrastructure.AI;
using SmartPropertyAI.Infrastructure.Identity;
using SmartPropertyAI.Infrastructure.Persistence;
using SmartPropertyAI.Infrastructure.Services;

namespace SmartPropertyAI.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = ResolveConnectionString(configuration);

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
            });
            options.ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        });

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        // 1. Configure ASP.NET Core Identity
        services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
        {
            // Password Policies
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequiredLength = 8;

            // User Policies
            options.User.RequireUniqueEmail = true;

            // Lockout Policies
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.AllowedForNewUsers = true;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        // 2. Register HttpContext Accessor and Identity Services
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IPropertyService, PropertyService>();
        services.AddScoped<IBuildingService, BuildingService>();
        services.AddScoped<IApartmentService, ApartmentService>();
        services.AddScoped<IResidentService, ResidentService>();
        services.AddScoped<IStaffService, StaffService>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IMaintenanceService, MaintenanceService>();
        services.AddScoped<IVisitorService, VisitorService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<IAmenityService, AmenityService>();
        services.AddScoped<IVisualDiagnosticsService, VisualDiagnosticsService>();

        // 3. Health Checks
        services.AddHealthChecks()
            .AddDbContextCheck<ApplicationDbContext>(name: "postgresql", tags: new[] { "db", "ready" });

        // 4. AI Services & Provider Abstraction
        services.Configure<OpenAiSettings>(configuration.GetSection(OpenAiSettings.SectionName));
        services.AddSingleton<IPromptTemplateManager, PromptTemplateManager>();
        services.AddSingleton<MockAiProvider>();
        services.AddHttpClient<OpenAiProvider>();

        services.AddScoped<IAiProvider>(sp =>
        {
            var providerChoice = Environment.GetEnvironmentVariable("AI_PROVIDER");
            if (string.Equals(providerChoice, "Mock", StringComparison.OrdinalIgnoreCase))
            {
                return sp.GetRequiredService<MockAiProvider>();
            }
            return sp.GetRequiredService<OpenAiProvider>();
        });

        // 5. Phase 6 AI Orchestration & Conversation Services
        services.AddSingleton<IAiToolRegistry, AiToolRegistry>();
        services.AddSingleton<IIntentDetectionService, IntentDetectionService>();
        services.AddScoped<IConversationalFormService, ConversationalFormService>();
        services.AddScoped<IAiToolExecutionService, AiToolExecutionService>();
        services.AddScoped<IConversationService, ConversationService>();
        services.AddScoped<IAiOrchestratorService, AiOrchestratorService>();

        return services;
    }

    private static string ResolveConnectionString(IConfiguration configuration)
    {
        var raw = configuration.GetConnectionString("DefaultConnection")
            ?? configuration["DATABASE_URL"]
            ?? Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' or 'DATABASE_URL' was not found.");

        if (raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(raw);
                var userInfo = uri.UserInfo.Split(':');
                var isInternalRender = uri.Host.StartsWith("dpg-", StringComparison.OrdinalIgnoreCase) && !uri.Host.Contains('.');

                var builder = new Npgsql.NpgsqlConnectionStringBuilder
                {
                    Host = uri.Host,
                    Port = uri.Port > 0 ? uri.Port : 5432,
                    Username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "",
                    Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "",
                    Database = uri.AbsolutePath.TrimStart('/'),
                    SslMode = isInternalRender ? Npgsql.SslMode.Disable : Npgsql.SslMode.Prefer,
                    Timeout = 15,
                    CommandTimeout = 30
                };
                return builder.ConnectionString;
            }
            catch
            {
                return raw;
            }
        }

        return raw;
    }
}
