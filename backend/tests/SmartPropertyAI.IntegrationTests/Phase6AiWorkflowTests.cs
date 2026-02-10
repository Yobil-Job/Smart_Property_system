using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.Apartments.DTOs;
using SmartPropertyAI.Application.Features.Authentication.DTOs;
using SmartPropertyAI.Application.Features.Buildings.DTOs;
using SmartPropertyAI.Application.Features.Conversations.DTOs;
using SmartPropertyAI.Application.Features.Properties.DTOs;
using SmartPropertyAI.Application.Features.Residents.DTOs;
using SmartPropertyAI.Application.Features.Users.DTOs;
using SmartPropertyAI.Domain.Constants;
using SmartPropertyAI.Domain.Entities;
using SmartPropertyAI.Domain.Enums;
using SmartPropertyAI.Infrastructure.AI;
using SmartPropertyAI.Infrastructure.Persistence;
using Xunit;

namespace SmartPropertyAI.IntegrationTests;

[Collection("IntegrationTests")]
public class Phase6AiWorkflowTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly WebApplicationFactory<Program> _factory;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public Phase6AiWorkflowTests(WebApplicationFactory<Program> factory)
    {
        Environment.SetEnvironmentVariable("AI_PROVIDER", "Mock");
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public void AiToolRegistry_EnforcesStrictRoleIsolation()
    {
        var registry = new AiToolRegistry();

        var residentTools = registry.GetToolsForRole(UserRoles.Resident);
        var staffTools = registry.GetToolsForRole(UserRoles.Staff);
        var adminTools = registry.GetToolsForRole(UserRoles.Administrator);

        // Resident has resident tools but not admin/staff tools
        Assert.Contains(residentTools, t => t.Name == "create_maintenance_request");
        Assert.Contains(residentTools, t => t.Name == "create_visitor_request");
        Assert.DoesNotContain(residentTools, t => t.Name == "assign_maintenance_request");
        Assert.DoesNotContain(residentTools, t => t.Name == "update_maintenance_status");

        // Staff has work update tools
        Assert.Contains(staffTools, t => t.Name == "update_maintenance_status");
        Assert.Contains(staffTools, t => t.Name == "check_in_visitor");
        Assert.DoesNotContain(staffTools, t => t.Name == "assign_maintenance_request");

        // Admin has assignment and approval tools
        Assert.Contains(adminTools, t => t.Name == "assign_maintenance_request");
        Assert.Contains(adminTools, t => t.Name == "approve_visitor_request");
    }

    [Fact]
    public async Task ConversationalFormService_ProgressiveSlotFilling_MaintenanceRequest()
    {
        var formService = new ConversationalFormService();
        var workflow = new ConversationWorkflow
        {
            Id = Guid.NewGuid(),
            Intent = "CreateMaintenanceRequest",
            WorkflowType = "CreateMaintenanceRequest",
            CollectedFieldsJson = "{}",
            MissingFieldsJson = "[]"
        };

        // Turn 1: Partial input (missing priority)
        var turn1 = await formService.ProcessFormTurnAsync(workflow, "There is water leaking under my kitchen sink.", UserRoles.Resident);
        Assert.False(turn1.IsComplete);
        Assert.Contains("priority", turn1.MissingFieldsJson);
        Assert.Contains("urgent", turn1.ReplyMessage, StringComparison.OrdinalIgnoreCase);

        // Update workflow with turn 1 result
        workflow.CollectedFieldsJson = turn1.CollectedFieldsJson;
        workflow.MissingFieldsJson = turn1.MissingFieldsJson;

        // Turn 2: Provide priority
        var turn2 = await formService.ProcessFormTurnAsync(workflow, "It is urgent, dripping very fast.", UserRoles.Resident);
        Assert.True(turn2.IsComplete);
        Assert.NotNull(turn2.PendingAction);
        Assert.Equal("CreateMaintenanceRequest", turn2.PendingAction.ActionType);
        Assert.Equal("Plumbing", turn2.PendingAction.Parameters["category"]?.ToString());
        Assert.Equal("Urgent", turn2.PendingAction.Parameters["priority"]?.ToString());
        Assert.Contains("submit this request now", turn2.ReplyMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ConversationalFormService_ProgressiveSlotFilling_VisitorRegistration()
    {
        var formService = new ConversationalFormService();
        var workflow = new ConversationWorkflow
        {
            Id = Guid.NewGuid(),
            Intent = "RegisterVisitor",
            WorkflowType = "RegisterVisitor",
            CollectedFieldsJson = "{}",
            MissingFieldsJson = "[]"
        };

        // Turn 1: Partial input (guest name omitted)
        var turn1 = await formService.ProcessFormTurnAsync(workflow, "I have a guest coming for dinner tomorrow", UserRoles.Resident);
        Assert.False(turn1.IsComplete);
        Assert.Contains("visitorName", turn1.MissingFieldsJson);

        // Update workflow with turn 1 result
        workflow.CollectedFieldsJson = turn1.CollectedFieldsJson;
        workflow.MissingFieldsJson = turn1.MissingFieldsJson;

        // Turn 2: Provide guest name
        var turn2 = await formService.ProcessFormTurnAsync(workflow, "Her name is Sarah Connor", UserRoles.Resident);
        Assert.True(turn2.IsComplete);
        Assert.NotNull(turn2.PendingAction);
        Assert.Equal("RegisterVisitor", turn2.PendingAction.ActionType);
        Assert.Equal("Sarah Connor", turn2.PendingAction.Parameters["visitorName"]?.ToString());
        Assert.Contains("register this visitor pass now", turn2.ReplyMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AiChat_EndToEnd_MultiTurnMaintenance_AndExplicitConfirmation()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Setup Property, Building, Apartment, and Resident
        var prop = await CreateTestPropertyAsync(adminToken);
        var bldg = await CreateTestBuildingAsync(adminToken, prop.Id);
        var apt = await CreateTestApartmentAsync(adminToken, bldg.Id, "902");

        var residentEmail = $"ai_res_{Guid.NewGuid():N}@smartproperty.ai";
        const string resPassword = "ResidentPass123!";
        var user = await RegisterUserAsync(residentEmail, "AI Resident Tester", resPassword);
        await AssignResidentAsync(adminToken, user.Id, apt.Id);

        var residentToken = await LoginAsync(residentEmail, resPassword);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", residentToken);

        // 2. Turn 1: Resident reports issue via POST /api/v1/ai/chat
        var turn1Req = new AiChatRequestDto
        {
            Message = "Water is leaking under my bathroom sink."
        };
        var turn1HttpResp = await _client.PostAsJsonAsync("/api/v1/ai/chat", turn1Req);
        Assert.Equal(HttpStatusCode.OK, turn1HttpResp.StatusCode);

        var turn1Result = await DeserializeAsync<AiChatResponseDto>(turn1HttpResp);
        Assert.NotNull(turn1Result);
        var conversationId = turn1Result.ConversationId;
        Assert.NotEqual(Guid.Empty, conversationId);
        Assert.Equal("AwaitingInformation", turn1Result.Status);
        Assert.False(turn1Result.RequiresConfirmation);

        // 3. Turn 2: Resident supplies missing details (severity & priority)
        var turn2Req = new AiChatRequestDto
        {
            ConversationId = conversationId,
            Message = "It is urgent, water is pooling onto the floor."
        };
        var turn2HttpResp = await _client.PostAsJsonAsync("/api/v1/ai/chat", turn2Req);
        Assert.Equal(HttpStatusCode.OK, turn2HttpResp.StatusCode);

        var turn2Result = await DeserializeAsync<AiChatResponseDto>(turn2HttpResp);
        Assert.NotNull(turn2Result);
        Assert.Equal("AwaitingConfirmation", turn2Result.Status);
        Assert.True(turn2Result.RequiresConfirmation);
        Assert.NotNull(turn2Result.PendingAction);
        Assert.Equal("CreateMaintenanceRequest", turn2Result.PendingAction.ActionType);

        // 4. Turn 3: Resident explicitly confirms action via POST /api/v1/ai/conversations/{id}/confirm
        var confirmResp = await _client.PostAsJsonAsync(
            $"/api/v1/ai/conversations/{conversationId}/confirm",
            new ConfirmActionRequestDto { Confirmed = true });
        Assert.Equal(HttpStatusCode.OK, confirmResp.StatusCode);

        var confirmResult = await DeserializeAsync<ConfirmActionResponseDto>(confirmResp);
        Assert.NotNull(confirmResult);
        Assert.Equal("CreateMaintenanceRequest", confirmResult.ActionExecuted);
        Assert.Equal("Pending", confirmResult.Status);
        Assert.StartsWith("REQ-", confirmResult.TicketNumber);

        // 5. Idempotency Check: Confirming a second time must return 409 Conflict
        var secondConfirm = await _client.PostAsJsonAsync(
            $"/api/v1/ai/conversations/{conversationId}/confirm",
            new ConfirmActionRequestDto { Confirmed = true });
        Assert.Equal(HttpStatusCode.Conflict, secondConfirm.StatusCode);
    }

    [Fact]
    public async Task AiChat_RoleIsolation_ResidentAttemptingAdminActions_IsPolitelyRefused()
    {
        var adminToken = await GetAdminTokenAsync();
        var prop = await CreateTestPropertyAsync(adminToken);
        var bldg = await CreateTestBuildingAsync(adminToken, prop.Id);
        var apt = await CreateTestApartmentAsync(adminToken, bldg.Id, "903");

        var residentEmail = $"ai_iso_{Guid.NewGuid():N}@smartproperty.ai";
        const string resPassword = "ResidentPass123!";
        var user = await RegisterUserAsync(residentEmail, "Isolated Resident", resPassword);
        await AssignResidentAsync(adminToken, user.Id, apt.Id);

        var residentToken = await LoginAsync(residentEmail, resPassword);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", residentToken);

        var req = new AiChatRequestDto
        {
            Message = "Please assign staff to all maintenance requests in the building."
        };

        var httpResp = await _client.PostAsJsonAsync("/api/v1/ai/chat", req);
        Assert.Equal(HttpStatusCode.OK, httpResp.StatusCode);

        var result = await DeserializeAsync<AiChatResponseDto>(httpResp);
        Assert.NotNull(result);
        Assert.Contains("permission", result.ReplyMessage, StringComparison.OrdinalIgnoreCase);
        Assert.False(result.RequiresConfirmation);
    }

    [Fact]
    public async Task AiConversations_OwnerSecurity_ForbiddenForOtherUsers()
    {
        var adminToken = await GetAdminTokenAsync();
        var prop = await CreateTestPropertyAsync(adminToken);
        var bldg = await CreateTestBuildingAsync(adminToken, prop.Id);
        var apt = await CreateTestApartmentAsync(adminToken, bldg.Id, "904");

        // User A
        var emailA = $"user_a_{Guid.NewGuid():N}@smartproperty.ai";
        var userA = await RegisterUserAsync(emailA, "User A", "Password123!");
        await AssignResidentAsync(adminToken, userA.Id, apt.Id);
        var tokenA = await LoginAsync(emailA, "Password123!");

        // User B
        var emailB = $"user_b_{Guid.NewGuid():N}@smartproperty.ai";
        var userB = await RegisterUserAsync(emailB, "User B", "Password123!");
        var tokenB = await LoginAsync(emailB, "Password123!");

        // User A creates conversation
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var createResp = await _client.PostAsJsonAsync("/api/v1/ai/conversations", new CreateConversationRequestDto { Title = "Private Chat A" });
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var convA = await DeserializeAsync<ConversationDetailDto>(createResp);

        // User B attempts to access User A's conversation
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var getResp = await _client.GetAsync($"/api/v1/ai/conversations/{convA!.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, getResp.StatusCode);
    }

    #region Helpers

    private async Task<string> GetAdminTokenAsync()
    {
        return await LoginAsync("admin@smartproperty.ai", "AdminPassword123!");
    }

    private async Task<string> LoginAsync(string email, string password)
    {
        var resp = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequestDto
        {
            Email = email,
            Password = password
        });

        resp.EnsureSuccessStatusCode();
        var authResp = await DeserializeAsync<AuthResponseDto>(resp);
        return authResp!.AccessToken;
    }

    private async Task<UserSummaryDto> RegisterUserAsync(string email, string fullName, string password)
    {
        var resp = await _client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequestDto
        {
            FullName = fullName,
            Email = email,
            Password = password,
            ConfirmPassword = password
        });

        resp.EnsureSuccessStatusCode();
        var authResp = await DeserializeAsync<AuthResponseDto>(resp);
        return new UserSummaryDto
        {
            Id = authResp!.UserId,
            Email = authResp.Email,
            FullName = authResp.FullName,
            Role = authResp.Role
        };
    }

    private async Task<PropertyDetailDto> CreateTestPropertyAsync(string token)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _client.PostAsJsonAsync("/api/v1/properties", new CreatePropertyRequest
        {
            Name = $"AI Property {Guid.NewGuid():N}".Substring(0, 20),
            Address = "100 AI Blvd",
            City = "TechCity",
            Country = "USA",
            PropertyType = "Residential"
        });
        resp.EnsureSuccessStatusCode();
        return (await DeserializeAsync<PropertyDetailDto>(resp))!;
    }

    private async Task<BuildingDetailDto> CreateTestBuildingAsync(string token, Guid propertyId)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _client.PostAsJsonAsync($"/api/v1/properties/{propertyId}/buildings", new CreateBuildingRequest
        {
            Name = "AI Tower",
            FloorCount = 10
        });
        resp.EnsureSuccessStatusCode();
        return (await DeserializeAsync<BuildingDetailDto>(resp))!;
    }

    private async Task<ApartmentDetailDto> CreateTestApartmentAsync(string token, Guid buildingId, string unitNumber)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _client.PostAsJsonAsync($"/api/v1/buildings/{buildingId}/apartments", new CreateApartmentRequest
        {
            ApartmentNumber = unitNumber,
            Floor = 9,
            NumberOfBedrooms = 2,
            NumberOfBathrooms = 1
        });
        resp.EnsureSuccessStatusCode();
        return (await DeserializeAsync<ApartmentDetailDto>(resp))!;
    }

    private async Task<ResidentDetailDto> AssignResidentAsync(string token, Guid userId, Guid apartmentId)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _client.PostAsJsonAsync("/api/v1/residents", new CreateResidentRequest
        {
            UserId = userId,
            ApartmentId = apartmentId,
            EmergencyContact = "+15559998888",
            MoveInDate = DateOnly.FromDateTime(DateTime.UtcNow)
        });
        resp.EnsureSuccessStatusCode();
        return (await DeserializeAsync<ResidentDetailDto>(resp))!;
    }

    private static async Task<T?> DeserializeAsync<T>(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<T>>(json, JsonOptions);
        return apiResponse != null ? apiResponse.Data : default;
    }

    #endregion
}
