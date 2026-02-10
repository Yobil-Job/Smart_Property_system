using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using SmartPropertyAI.API.Controllers;
using SmartPropertyAI.Application.Common;
using Xunit;

namespace SmartPropertyAI.IntegrationTests;

[Collection("IntegrationTests")]
public class Phase1FoundationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public Phase1FoundationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthCheck_ReturnsHealthy_WithPostgreSqlDatabaseConnected()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"status\": \"Healthy\"", content);
        Assert.Contains("postgresql", content);
    }

    [Fact]
    public async Task SystemStatus_ReturnsOperational_AndStandardEnvelope()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/system/status");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<SystemStatusDto>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal("SmartProperty AI API service is operational", result.Message);
        Assert.NotNull(result.Data);
        Assert.True(result.Data.IsOperational);
        Assert.Equal("SmartProperty AI Web API", result.Data.Service);
    }

    [Theory]
    [InlineData("notfound", HttpStatusCode.NotFound)]
    [InlineData("validation", HttpStatusCode.UnprocessableEntity)]
    [InlineData("conflict", HttpStatusCode.Conflict)]
    [InlineData("forbidden", HttpStatusCode.Forbidden)]
    [InlineData("unauthorized", HttpStatusCode.Unauthorized)]
    [InlineData("unhandled", HttpStatusCode.InternalServerError)]
    public async Task GlobalExceptionMiddleware_CatchesAndFormatsExceptions(string errorType, HttpStatusCode expectedStatus)
    {
        // Act
        var response = await _client.GetAsync($"/api/v1/system/test-error?type={errorType}");

        // Assert
        Assert.Equal(expectedStatus, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        Assert.NotNull(result);
        Assert.False(result.Success);
        Assert.NotEmpty(result.Message);
        Assert.NotEmpty(result.Errors);
    }
}

