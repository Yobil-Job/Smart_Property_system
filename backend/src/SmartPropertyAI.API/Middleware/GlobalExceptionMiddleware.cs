using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Domain.Exceptions;

namespace SmartPropertyAI.API.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = HttpStatusCode.InternalServerError;
        var message = "An internal server error occurred.";
        var errors = new List<ErrorDetail>();

        switch (exception)
        {
            case ValidationException valEx:
                statusCode = HttpStatusCode.UnprocessableEntity;
                message = valEx.Message;
                foreach (var err in valEx.Errors)
                {
                    foreach (var msg in err.Value)
                    {
                        errors.Add(new ErrorDetail(err.Key, msg));
                    }
                }
                _logger.LogWarning(exception, "Validation failure on request: {Path}", context.Request.Path);
                break;

            case NotFoundException notFoundEx:
                statusCode = HttpStatusCode.NotFound;
                message = notFoundEx.Message;
                errors.Add(new ErrorDetail(notFoundEx.EntityName ?? "Resource", notFoundEx.Message));
                _logger.LogWarning(exception, "Resource not found: {Message}", notFoundEx.Message);
                break;

            case ConflictException conflictEx:
                statusCode = HttpStatusCode.Conflict;
                message = conflictEx.Message;
                errors.Add(new ErrorDetail("Conflict", conflictEx.Message));
                _logger.LogWarning(exception, "Conflict detected: {Message}", conflictEx.Message);
                break;

            case ForbiddenException forbiddenEx:
                statusCode = HttpStatusCode.Forbidden;
                message = forbiddenEx.Message;
                errors.Add(new ErrorDetail("Authorization", forbiddenEx.Message));
                _logger.LogWarning(exception, "Forbidden resource access: {Message}", forbiddenEx.Message);
                break;

            case UnauthorizedException unauthEx:
                statusCode = HttpStatusCode.Unauthorized;
                message = unauthEx.Message;
                errors.Add(new ErrorDetail("Authentication", unauthEx.Message));
                _logger.LogWarning(exception, "Unauthorized access: {Message}", unauthEx.Message);
                break;

            case AiProviderException aiEx:
                statusCode = aiEx.StatusCode;
                message = aiEx.Message;
                errors.Add(new ErrorDetail("AIProvider", aiEx.Message));
                _logger.LogError(exception, "AI provider failure: {Message}", aiEx.Message);
                break;

            case DomainException domainEx:
                statusCode = HttpStatusCode.BadRequest;
                message = domainEx.Message;
                errors.Add(new ErrorDetail("DomainRule", domainEx.Message));
                _logger.LogWarning(exception, "Domain rule violation: {Message}", domainEx.Message);
                break;

            case DbUpdateConcurrencyException concEx:
                statusCode = HttpStatusCode.InternalServerError;
                var concEntry = concEx.Entries.FirstOrDefault();
                var entityName = concEntry?.Metadata.Name ?? "Unknown";
                var keyValues = concEntry != null ? string.Join(", ", concEntry.Properties.Where(p => p.Metadata.IsPrimaryKey()).Select(p => $"{p.Metadata.Name}={p.CurrentValue}")) : "none";
                message = $"Concurrency error on {entityName} (Keys: {keyValues}): {concEx.Message}";
                errors.Add(new ErrorDetail("Concurrency", message));
                _logger.LogError(concEx, "DbUpdateConcurrencyException: {Message}", message);
                break;

            default:
                statusCode = HttpStatusCode.InternalServerError;
                message = _env.IsDevelopment()
                    ? exception.Message
                    : "An unexpected error occurred. Please contact support.";
                
                errors.Add(new ErrorDetail("UnhandledException", message));
                if (_env.IsDevelopment() && !string.IsNullOrEmpty(exception.StackTrace))
                {
                    errors.Add(new ErrorDetail("StackTrace", exception.StackTrace));
                }

                _logger.LogError(exception, "Unhandled exception occurred: {Message}", exception.Message);
                break;
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var response = ApiResponse.FailureResult(message, errors);
        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
    }
}

