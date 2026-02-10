using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Authentication.DTOs;
using SmartPropertyAI.Application.Features.Users.DTOs;
using Xunit;

namespace SmartPropertyAI.IntegrationTests;

[Collection("IntegrationTests")]
public class Phase2AuthTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public Phase2AuthTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task AdminLogin_Returns_ValidJwtAndRefreshToken()
    {
        // Act
        var loginPayload = new LoginRequestDto
        {
            Email = "admin@smartproperty.ai",
            Password = "AdminPassword123!"
        };

        var response = await _client.PostAsync("/api/v1/auth/login", CreateJsonContent(loginPayload));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<AuthResponseDto>>(json, JsonOptions);

        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Equal("Administrator", result.Data.Role);
        Assert.NotEmpty(result.Data.AccessToken);
        Assert.NotEmpty(result.Data.RefreshToken);
    }

    [Fact]
    public async Task Resident_Registration_DefaultsTo_ResidentRole()
    {
        // Arrange
        var uniqueEmail = $"resident_{Guid.NewGuid():N}@example.com";
        var registerPayload = new RegisterRequestDto
        {
            FullName = "Alice Resident",
            Email = uniqueEmail,
            Password = "StrongResident123!",
            ConfirmPassword = "StrongResident123!",
            PhoneNumber = "+1234567890"
        };

        // Act
        var response = await _client.PostAsync("/api/v1/auth/register", CreateJsonContent(registerPayload));

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<AuthResponseDto>>(json, JsonOptions);

        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Equal("Resident", result.Data.Role);
        Assert.NotEmpty(result.Data.AccessToken);
        Assert.NotEmpty(result.Data.RefreshToken);

        // Duplicate registration must return 409 Conflict
        var dupResponse = await _client.PostAsync("/api/v1/auth/register", CreateJsonContent(registerPayload));
        Assert.Equal(HttpStatusCode.Conflict, dupResponse.StatusCode);
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_Returns_Unauthorized401()
    {
        var loginPayload = new LoginRequestDto
        {
            Email = "nonexistent@smartproperty.ai",
            Password = "WrongPassword123!"
        };

        var response = await _client.PostAsync("/api/v1/auth/login", CreateJsonContent(loginPayload));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_Returns_Unauthorized401()
    {
        var response = await _client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CallingUsersEndpoint_WithResidentToken_Returns_Forbidden403()
    {
        // Arrange: Register a resident
        var email = $"resident_{Guid.NewGuid():N}@example.com";
        var regResponse = await _client.PostAsync("/api/v1/auth/register", CreateJsonContent(new RegisterRequestDto
        {
            FullName = "Bob Resident",
            Email = email,
            Password = "StrongResident123!",
            ConfirmPassword = "StrongResident123!",
            PhoneNumber = "+1999888777"
        }));

        var regJson = await regResponse.Content.ReadAsStringAsync();
        var regResult = JsonSerializer.Deserialize<ApiResponse<AuthResponseDto>>(regJson, JsonOptions);
        var token = regResult!.Data!.AccessToken;

        // Act: Attempt to list users (Admin-only policy)
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        // Assert: 403 Forbidden
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CallingUsersEndpoint_WithAdminToken_Returns_Ok200()
    {
        // Arrange: Login as admin
        var adminToken = await GetAdminTokenAsync();

        // Act
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var response = await _client.SendAsync(request);

        // Assert: 200 OK
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<PagedResult<UserSummaryDto>>>(json, JsonOptions);

        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.NotEmpty(result.Data.Items);
    }

    [Fact]
    public async Task RefreshTokenRotation_And_ReplayAttackDetection_WorkCorrectly()
    {
        // Arrange: Register user to get initial token pair
        var email = $"token_test_{Guid.NewGuid():N}@example.com";
        var regResponse = await _client.PostAsync("/api/v1/auth/register", CreateJsonContent(new RegisterRequestDto
        {
            FullName = "Token Tester",
            Email = email,
            Password = "StrongPassword123!",
            ConfirmPassword = "StrongPassword123!",
            PhoneNumber = "+1122334455"
        }));

        var regResult = JsonSerializer.Deserialize<ApiResponse<AuthResponseDto>>(
            await regResponse.Content.ReadAsStringAsync(), JsonOptions);
        var initialAccess = regResult!.Data!.AccessToken;
        var initialRefresh = regResult.Data.RefreshToken;

        // Act 1: Rotate refresh token
        var refreshPayload = new RefreshTokenRequestDto
        {
            AccessToken = initialAccess,
            RefreshToken = initialRefresh
        };

        var refreshResponse = await _client.PostAsync("/api/v1/auth/refresh", CreateJsonContent(refreshPayload));
        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

        var refreshResult = JsonSerializer.Deserialize<ApiResponse<AuthResponseDto>>(
            await refreshResponse.Content.ReadAsStringAsync(), JsonOptions);
        var newAccess = refreshResult!.Data!.AccessToken;
        var newRefresh = refreshResult.Data.RefreshToken;

        Assert.NotEqual(initialRefresh, newRefresh);
        Assert.NotEmpty(newAccess);

        // Act 2: Replay attack! Present the old, already-revoked refresh token
        var replayResponse = await _client.PostAsync("/api/v1/auth/refresh", CreateJsonContent(refreshPayload));

        // Assert 2: Must be rejected with 401 Unauthorized
        Assert.Equal(HttpStatusCode.Unauthorized, replayResponse.StatusCode);
    }

    [Fact]
    public async Task Admin_CanCreateStaffUser_AndAssignRole()
    {
        var adminToken = await GetAdminTokenAsync();

        var staffEmail = $"staff_{Guid.NewGuid():N}@smartproperty.ai";
        var createPayload = new CreateUserRequestDto
        {
            FullName = "Officer John",
            Email = staffEmail,
            PhoneNumber = "+1555666777",
            InitialPassword = "StaffPassword123!",
            Role = "Staff"
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        request.Content = CreateJsonContent(createPayload);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<UserSummaryDto>>(json, JsonOptions);

        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Equal("Staff", result.Data.Role);
        Assert.Equal(staffEmail, result.Data.Email);
    }

    private async Task<string> GetAdminTokenAsync()
    {
        var loginPayload = new LoginRequestDto
        {
            Email = "admin@smartproperty.ai",
            Password = "AdminPassword123!"
        };

        var response = await _client.PostAsync("/api/v1/auth/login", CreateJsonContent(loginPayload));
        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<AuthResponseDto>>(json, JsonOptions);
        return result!.Data!.AccessToken;
    }

    private static StringContent CreateJsonContent(object obj)
    {
        return new StringContent(JsonSerializer.Serialize(obj), Encoding.UTF8, "application/json");
    }
}
