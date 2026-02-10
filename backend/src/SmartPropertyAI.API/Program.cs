using System.Net.Mime;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Serilog;
using SmartPropertyAI.API.Middleware;
using SmartPropertyAI.Application;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Infrastructure;
using SmartPropertyAI.Infrastructure.Identity;

// 1. Initialize Serilog bootstrap logger
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting SmartProperty AI Web API bootstrap pipeline...");

    LoadDotEnvFile();

    var builder = WebApplication.CreateBuilder(args);

    // Bind to cloud platform PORT environment variable if provided (e.g. Render, Railway, Fly.io)
    var cloudPort = Environment.GetEnvironmentVariable("PORT");
    if (!string.IsNullOrEmpty(cloudPort))
    {
        builder.WebHost.UseUrls($"http://*:{cloudPort}");
    }

    // 2. Configure Serilog host
    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"));

    // 3. Register Application and Infrastructure layers
    builder.Services.AddApplicationServices();
    builder.Services.AddInfrastructureServices(builder.Configuration);

    // 4. Configure Authentication & JWT Bearer
    var jwtSettings = builder.Configuration.GetSection("JwtSettings");
    var secretKey = jwtSettings["SecretKey"]
        ?? throw new InvalidOperationException("JwtSettings:SecretKey is required.");
    var issuer = jwtSettings["Issuer"] ?? "SmartPropertyAI";
    var audience = jwtSettings["Audience"] ?? "SmartPropertyAI_Clients";

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

    // 5. Configure Authorization Policies
    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("RequireAdminRole", policy => policy.RequireRole(UserRoles.Administrator));
        options.AddPolicy("RequireStaffRole", policy => policy.RequireRole(UserRoles.Staff));
        options.AddPolicy("RequireResidentRole", policy => policy.RequireRole(UserRoles.Resident));
        options.AddPolicy("RequireStaffOrAdminRole", policy => policy.RequireRole(UserRoles.Administrator, UserRoles.Staff));
    });

    // 6. Add Controllers
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();

    // 7. Configure Swagger / OpenAPI with Bearer JWT Support
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "SmartProperty AI Web API",
            Version = "v1",
            Description = "Enterprise Property Management Web API with Conversational AI Orchestration (Clean Architecture / PostgreSQL)"
        });

        var securityScheme = new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT"
        };

        c.AddSecurityDefinition("Bearer", securityScheme);

        c.AddSecurityRequirement((document) => new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecuritySchemeReference("Bearer"),
                new List<string>()
            }
        });
    });

    // 8. Configure CORS
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowAllDevOrigins", policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
    });

    var app = builder.Build();

    // 9. HTTP Request Pipeline
    app.UseMiddleware<GlobalExceptionMiddleware>();

    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "SmartProperty AI v1");
            c.RoutePrefix = "swagger";
        });
    }

    app.UseRouting();
    app.UseCors("AllowAllDevOrigins");
    app.UseStaticFiles();

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();

    // 10. Health Check Endpoints (instant 200 OK for Render liveness probe)
    app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));

    app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        ResponseWriter = async (context, report) =>
        {
            context.Response.ContentType = MediaTypeNames.Application.Json;

            var result = JsonSerializer.Serialize(new
            {
                status = report.Status.ToString(),
                totalDuration = report.TotalDuration.ToString(),
                entries = report.Entries.ToDictionary(
                    e => e.Key,
                    e => new
                    {
                        status = e.Value.Status.ToString(),
                        description = e.Value.Description ?? "Operational",
                        duration = e.Value.Duration.ToString(),
                        data = e.Value.Data
                    })
            }, new JsonSerializerOptions { WriteIndented = true });

            await context.Response.WriteAsync(result);
        }
    });

    // 11. Seed Identity Roles and Default Administrator asynchronously
    _ = Task.Run(async () =>
    {
        try
        {
            await IdentityDataSeeder.SeedAsync(app.Services);
            Log.Information("Database migrations and default seed data applied successfully.");
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Background database migration and seeding encountered an error.");
        }
    });

    Log.Information("SmartProperty AI Web API configured successfully. Launching server...");
    app.Run();
}
catch (HostAbortedException)
{
    // Normal termination when called by EF Core design-time tools
    throw;
}
catch (Exception ex)
{
    Log.Fatal(ex, "SmartProperty AI Web API terminated unexpectedly during startup.");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program
{
    private static void LoadDotEnvFile()
    {
        string? envPath = null;
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir != null)
        {
            var p = Path.Combine(dir.FullName, ".env");
            if (File.Exists(p))
            {
                envPath = p;
                break;
            }
            dir = dir.Parent;
        }

        if (envPath == null)
        {
            var baseDirInfo = new DirectoryInfo(AppContext.BaseDirectory);
            while (baseDirInfo != null)
            {
                var p = Path.Combine(baseDirInfo.FullName, ".env");
                if (File.Exists(p))
                {
                    envPath = p;
                    break;
                }
                baseDirInfo = baseDirInfo.Parent;
            }
        }

        if (envPath == null) return;

        foreach (var line in File.ReadAllLines(envPath))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith('#')) continue;
            var parts = trimmed.Split('=', 2);
            if (parts.Length == 2)
            {
                var key = parts[0].Trim();
                var value = parts[1].Trim().Trim('"').Trim('\'');
                if (!string.IsNullOrEmpty(key))
                {
                    Environment.SetEnvironmentVariable(key, value);
                }
            }
        }
    }
}
