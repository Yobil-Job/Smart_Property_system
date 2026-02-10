using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.AI.DTOs;
using SmartPropertyAI.Application.Features.Authentication.DTOs;
using SmartPropertyAI.Domain.Exceptions;
using SmartPropertyAI.Infrastructure.AI;
using Xunit;

namespace SmartPropertyAI.IntegrationTests;

[Collection("IntegrationTests")]
public class Phase5AiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public Phase5AiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task MockAiProvider_ExecutesChat_StructuredOutput_AndToolSelection()
    {
        var provider = new MockAiProvider();

        // 1. Chat Completion
        var chatRequest = new AiChatRequest
        {
            Messages = new List<AiChatMessage>
            {
                AiChatMessage.System("You are a helpful assistant."),
                AiChatMessage.User("Respond with 'PONG'")
            }
        };

        var chatResponse = await provider.GenerateChatCompletionAsync(chatRequest);
        Assert.NotNull(chatResponse);
        Assert.Equal("PONG", chatResponse.Content);
        Assert.True(chatResponse.Usage.TotalTokens > 0);

        // 2. Structured Output
        var structuredRequest = new AiStructuredRequest
        {
            SystemPrompt = "Extract maintenance issue",
            UserPrompt = "My sink is leaking"
        };
        var structuredResult = await provider.GenerateStructuredOutputAsync<TestExtractionDto>(structuredRequest);
        Assert.NotNull(structuredResult);

        // 3. Tool Selection
        var toolRequest = new AiToolSelectionRequest
        {
            Messages = new List<AiChatMessage> { AiChatMessage.User("Schedule a plumbing inspection") },
            Tools = new List<AiToolDefinition>
            {
                new()
                {
                    Name = "create_maintenance_ticket",
                    Description = "Creates a maintenance ticket"
                }
            }
        };

        var toolResponse = await provider.GenerateToolSelectionAsync(toolRequest);
        Assert.NotNull(toolResponse);
        Assert.True(toolResponse.HasToolCall);
        Assert.Equal("create_maintenance_ticket", toolResponse.ToolCalls[0].ToolName);
    }

    [Fact]
    public void PromptTemplateManager_LoadsAndRendersAllTemplates()
    {
        var templateManager = new PromptTemplateManager();

        var residentTemplate = templateManager.GetTemplate("System_Resident_Assistant");
        Assert.Contains("Resident Assistant", residentTemplate);

        var staffTemplate = templateManager.GetTemplate("System_Staff_Assistant");
        Assert.Contains("Staff Operations Assistant", staffTemplate);

        var adminTemplate = templateManager.GetTemplate("System_Admin_Assistant");
        Assert.Contains("Administrator", adminTemplate);

        var intentTemplate = templateManager.GetTemplate("System_Intent_Extraction");
        Assert.Contains("Intent Extraction", intentTemplate);

        // Render template with parameters
        var rendered = templateManager.RenderTemplate("System_Resident_Assistant", new Dictionary<string, string>
        {
            { "Property", "Oakridge Towers" }
        });
        Assert.NotNull(rendered);
    }

    [Fact]
    public async Task AiDiagnostics_Ping_WithMockProvider_Returns_Healthy200()
    {
        // Set environment variable to Mock for test environment
        Environment.SetEnvironmentVariable("AI_PROVIDER", "Mock");

        var adminToken = await GetAdminTokenAsync();

        var pingPayload = new AiPingRequest
        {
            ModelOverride = "mock-gpt-test"
        };

        var response = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/ai/diagnostics/ping", adminToken, pingPayload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await DeserializeAsync<AiPingResponse>(response);
        Assert.NotNull(result?.Data);
        Assert.Equal("Healthy", result.Data.Status);
        Assert.Equal("PONG", result.Data.Echo);
        Assert.Equal("mock-gpt-test", result.Data.Model);
    }

    [Fact]
    public async Task AiDiagnostics_Ping_NonAdmin_Returns_Forbidden403()
    {
        // Register a resident user
        var email = $"res_ai_{Guid.NewGuid():N}@smartproperty.ai";
        const string password = "ResidentPassword123!";
        await RegisterResidentUserAsync(email, "Resident User", password);
        var residentToken = await LoginAsync(email, password);

        var response = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/ai/diagnostics/ping", residentToken, new AiPingRequest());
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public void OpenAiProvider_WithoutKey_Throws_AiProviderException_BadGateway()
    {
        // Ensure no API key is set in environment for this test instance
        var originalKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
        try
        {
            Environment.SetEnvironmentVariable("OPENAI_API_KEY", "");
            Environment.SetEnvironmentVariable("GROQ_API_KEY", "");

            var options = Microsoft.Extensions.Options.Options.Create(new OpenAiSettings { ApiKey = "" });
            var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<OpenAiProvider>();
            var provider = new OpenAiProvider(new HttpClient(), options, logger);

            var ex = Assert.ThrowsAsync<AiProviderException>(() => provider.PingAsync());
            Assert.NotNull(ex);
        }
        finally
        {
            if (!string.IsNullOrEmpty(originalKey))
            {
                Environment.SetEnvironmentVariable("OPENAI_API_KEY", originalKey);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    private async Task<string> GetAdminTokenAsync()
    {
        return await LoginAsync("admin@smartproperty.ai", "AdminPassword123!");
    }

    private async Task<string> LoginAsync(string email, string password)
    {
        var payload = new LoginRequestDto { Email = email, Password = password };
        var response = await _client.PostAsync("/api/v1/auth/login", CreateJsonContent(payload));
        response.EnsureSuccessStatusCode();

        var result = await DeserializeAsync<AuthResponseDto>(response);
        return result!.Data!.AccessToken;
    }

    private async Task RegisterResidentUserAsync(string email, string fullName, string password)
    {
        var payload = new RegisterRequestDto
        {
            FullName = fullName,
            Email = email,
            Password = password,
            ConfirmPassword = password
        };

        var response = await _client.PostAsync("/api/v1/auth/register", CreateJsonContent(payload));
        response.EnsureSuccessStatusCode();
    }

    private async Task<HttpResponseMessage> SendAuthorizedAsync(HttpMethod method, string uri, string token, object? body = null)
    {
        using var request = new HttpRequestMessage(method, uri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null)
        {
            request.Content = CreateJsonContent(body);
        }
        return await _client.SendAsync(request);
    }

    private static StringContent CreateJsonContent(object payload)
    {
        return new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
    }

    private static async Task<ApiResponse<T>?> DeserializeAsync<T>(HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<ApiResponse<T>>(content, JsonOptions);
    }

    private class TestExtractionDto
    {
        public string Category { get; set; } = "Plumbing";
        public string Priority { get; set; } = "High";
    }
}

