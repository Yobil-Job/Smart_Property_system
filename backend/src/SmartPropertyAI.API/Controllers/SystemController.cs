using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Domain.Exceptions;

namespace SmartPropertyAI.API.Controllers;

[AllowAnonymous]
public class SystemController : BaseApiController
{
    private readonly IHostEnvironment _env;

    public SystemController(IHostEnvironment env)
    {
        _env = env;
    }

    /// <summary>
    /// Returns API service health status, environment, version, and server UTC time.
    /// </summary>
    [HttpGet("status")]
    [ProducesResponseType(typeof(ApiResponse<SystemStatusDto>), StatusCodes.Status200OK)]
    public ActionResult<ApiResponse<SystemStatusDto>> GetStatus()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var version = assembly.GetName().Version?.ToString() ?? "1.0.0";

        var status = new SystemStatusDto
        {
            Service = "SmartProperty AI Web API",
            Version = version,
            Environment = _env.EnvironmentName,
            ServerUtcTime = DateTime.UtcNow,
            IsOperational = true
        };

        return OkResponse(status, "SmartProperty AI API service is operational");
    }

    /// <summary>
    /// Diagnostic endpoint to verify standardized error response formatting by GlobalExceptionMiddleware.
    /// </summary>
    /// <param name="type">Type of simulated error: notfound, validation, conflict, forbidden, unhandled</param>
    [HttpGet("test-error")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status500InternalServerError)]
    public IActionResult TestError([FromQuery] string type = "unhandled")
    {
        switch (type.ToLowerInvariant())
        {
            case "notfound":
                throw new NotFoundException("Property", "PRP-TEST-999");
            case "validation":
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "Title", new[] { "Title is required", "Title must be at least 5 characters" } },
                    { "Category", new[] { "Category must be a valid maintenance category" } }
                });
            case "conflict":
                throw new ConflictException("An apartment with number '402' already exists in this building.");
            case "forbidden":
                throw new ForbiddenException("Residents are not authorized to view internal staff notes.");
            case "unauthorized":
                throw new UnauthorizedException("Valid Bearer JWT access token is required.");
            default:
                throw new InvalidOperationException("Simulated unexpected server error for testing GlobalExceptionMiddleware.");
        }
    }
}

public class SystemStatusDto
{
    public string Service { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public DateTime ServerUtcTime { get; set; }
    public bool IsOperational { get; set; }
}

