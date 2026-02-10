using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Apartments.DTOs;
using SmartPropertyAI.Application.Features.AuditLogs.DTOs;
using SmartPropertyAI.Application.Features.Authentication.DTOs;
using SmartPropertyAI.Application.Features.Buildings.DTOs;
using SmartPropertyAI.Application.Features.Maintenance.DTOs;
using SmartPropertyAI.Application.Features.Properties.DTOs;
using SmartPropertyAI.Application.Features.Residents.DTOs;
using SmartPropertyAI.Application.Features.Staff.DTOs;
using SmartPropertyAI.Application.Features.Users.DTOs;
using SmartPropertyAI.Application.Features.Visitors.DTOs;
using Xunit;

namespace SmartPropertyAI.IntegrationTests;

[Collection("IntegrationTests")]
public class Phase4OperationsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public Phase4OperationsTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task MaintenanceRequest_Lifecycle_FromSubmission_ToResolution()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Setup Property, Building, Apartment, Resident, and Staff
        var property = await CreateTestPropertyAsync(adminToken);
        var building = await CreateTestBuildingAsync(adminToken, property.Id);
        var apartment = await CreateTestApartmentAsync(adminToken, building.Id, "601");

        var residentEmail = $"maint_res_{Guid.NewGuid():N}@smartproperty.ai";
        const string resPassword = "ResidentPassword123!";
        var residentUser = await RegisterUserAsync(residentEmail, "Michael Resident", resPassword);

        var resident = await AssignResidentAsync(adminToken, residentUser.Id, apartment.Id);

        var staffEmail = $"maint_staff_{Guid.NewGuid():N}@smartproperty.ai";
        const string staffPassword = "StaffPassword123!";
        var staffUser = await CreateStaffUserAsync(adminToken, staffEmail, staffPassword);
        var staff = await OnboardStaffAsync(adminToken, staffUser.Id, property.Id, "Lead Technician");

        // 2. Resident logs in and submits maintenance request
        var residentToken = await LoginAsync(residentEmail, resPassword);

        var createReqPayload = new CreateMaintenanceRequest
        {
            Title = "Leaking bathroom pipe",
            Description = "Water leaking under the sink continuously.",
            Category = "Plumbing",
            Priority = "High"
        };

        var submitResp = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/maintenance", residentToken, createReqPayload);
        Assert.Equal(HttpStatusCode.Created, submitResp.StatusCode);
        var submitResult = await DeserializeAsync<MaintenanceRequestDetailDto>(submitResp);
        Assert.NotNull(submitResult?.Data);
        Assert.Equal("Pending", submitResult.Data.Status);
        Assert.Equal(apartment.Id, submitResult.Data.ApartmentId); // ApartmentId derived automatically
        var ticketId = submitResult.Data.Id;

        // 3. Invalid status transition check (Pending -> Closed directly returns 400 Bad Request)
        var invalidStatusPayload = new UpdateMaintenanceStatusRequest
        {
            Status = "Closed",
            Comment = "Attempt direct close"
        };
        var invalidResp = await SendAuthorizedAsync(HttpMethod.Patch, $"/api/v1/maintenance/{ticketId}/status", adminToken, invalidStatusPayload);
        Assert.Equal(HttpStatusCode.BadRequest, invalidResp.StatusCode);

        // 4. Admin assigns ticket to staff member
        var assignPayload = new AssignMaintenanceRequest { StaffId = staff.Id };
        var assignResp = await SendAuthorizedAsync(HttpMethod.Patch, $"/api/v1/maintenance/{ticketId}/assign", adminToken, assignPayload);
        Assert.Equal(HttpStatusCode.OK, assignResp.StatusCode);
        var assignResult = await DeserializeAsync<MaintenanceRequestDetailDto>(assignResp);
        Assert.NotNull(assignResult?.Data);
        Assert.Equal("Assigned", assignResult.Data.Status);
        Assert.Equal(staff.Id, assignResult.Data.AssignedStaffId);

        // 5. Staff logs in and begins work (Assigned -> InProgress)
        var staffToken = await LoginAsync(staffEmail, staffPassword);

        var inProgressPayload = new UpdateMaintenanceStatusRequest
        {
            Status = "InProgress",
            Comment = "Arrived on site and diagnosed valve seal failure."
        };
        var inProgressResp = await SendAuthorizedAsync(HttpMethod.Patch, $"/api/v1/maintenance/{ticketId}/status", staffToken, inProgressPayload);
        Assert.Equal(HttpStatusCode.OK, inProgressResp.StatusCode);

        // 6. Staff adds an internal work note
        var notePayload = new AddMaintenanceNoteRequest
        {
            NoteText = "Internal technician diagnosis: replacement gasket required.",
            IsInternalOnly = true
        };
        var noteResp = await SendAuthorizedAsync(HttpMethod.Post, $"/api/v1/maintenance/{ticketId}/notes", staffToken, notePayload);
        Assert.Equal(HttpStatusCode.Created, noteResp.StatusCode);

        // 7. Resident views ticket -> internal note is filtered out
        var residentViewResp = await SendAuthorizedAsync(HttpMethod.Get, $"/api/v1/maintenance/{ticketId}", residentToken);
        Assert.Equal(HttpStatusCode.OK, residentViewResp.StatusCode);
        var residentViewResult = await DeserializeAsync<MaintenanceRequestDetailDto>(residentViewResp);
        Assert.NotNull(residentViewResult?.Data);
        Assert.DoesNotContain(residentViewResult.Data.Notes, n => n.IsInternalOnly);

        // 8. Staff marks ticket as Resolved (ResolvedAt timestamp set)
        var resolvePayload = new UpdateMaintenanceStatusRequest
        {
            Status = "Resolved",
            Comment = "Valve gasket replaced; verified leak is resolved."
        };
        var resolveResp = await SendAuthorizedAsync(HttpMethod.Patch, $"/api/v1/maintenance/{ticketId}/status", staffToken, resolvePayload);
        Assert.Equal(HttpStatusCode.OK, resolveResp.StatusCode);
        var resolveResult = await DeserializeAsync<MaintenanceRequestDetailDto>(resolveResp);
        Assert.NotNull(resolveResult?.Data);
        Assert.Equal("Resolved", resolveResult.Data.Status);
        Assert.NotNull(resolveResult.Data.ResolvedAt);
    }

    [Fact]
    public async Task VisitorManagement_Lifecycle_PreRegistration_Approval_CheckIn_CheckOut()
    {
        var adminToken = await GetAdminTokenAsync();

        // Setup Property, Building, Apartment, Resident, and Staff
        var property = await CreateTestPropertyAsync(adminToken);
        var building = await CreateTestBuildingAsync(adminToken, property.Id);
        var apartment = await CreateTestApartmentAsync(adminToken, building.Id, "701");

        var residentEmail = $"visitor_host_{Guid.NewGuid():N}@smartproperty.ai";
        const string resPassword = "ResidentPassword123!";
        var residentUser = await RegisterUserAsync(residentEmail, "Dwight Schrute", resPassword);
        await AssignResidentAsync(adminToken, residentUser.Id, apartment.Id);

        var staffEmail = $"security_staff_{Guid.NewGuid():N}@smartproperty.ai";
        const string staffPassword = "StaffPassword123!";
        var staffUser = await CreateStaffUserAsync(adminToken, staffEmail, staffPassword);
        await OnboardStaffAsync(adminToken, staffUser.Id, property.Id, "Front Desk Officer");

        var residentToken = await LoginAsync(residentEmail, resPassword);
        var staffToken = await LoginAsync(staffEmail, staffPassword);

        // 1. Resident pre-registers visitor
        var expectedArr = DateTime.UtcNow.AddHours(2);
        var expectedDep = DateTime.UtcNow.AddHours(5);
        var createVisitorPayload = new CreateVisitorRequest
        {
            VisitorName = "Jim Halpert",
            VisitorPhone = "+1555123987",
            Purpose = "Social visit",
            ExpectedArrival = expectedArr,
            ExpectedDeparture = expectedDep
        };

        var createResp = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/visitors", residentToken, createVisitorPayload);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var createResult = await DeserializeAsync<VisitorDetailDto>(createResp);
        Assert.NotNull(createResult?.Data);
        Assert.Equal("Pending", createResult.Data.Status);
        var visitorId = createResult.Data.Id;

        // 2. Staff approves visitor pass
        var approveResp = await SendAuthorizedAsync(HttpMethod.Patch, $"/api/v1/visitors/{visitorId}/approve", staffToken);
        Assert.Equal(HttpStatusCode.OK, approveResp.StatusCode);
        var approveResult = await DeserializeAsync<VisitorDetailDto>(approveResp);
        Assert.NotNull(approveResult?.Data);
        Assert.Equal("Approved", approveResult.Data.Status);

        // 3. Security checks in visitor upon arrival
        var checkInResp = await SendAuthorizedAsync(HttpMethod.Patch, $"/api/v1/visitors/{visitorId}/check-in", staffToken);
        Assert.Equal(HttpStatusCode.OK, checkInResp.StatusCode);
        var checkInResult = await DeserializeAsync<VisitorDetailDto>(checkInResp);
        Assert.NotNull(checkInResult?.Data);
        Assert.Equal("CheckedIn", checkInResult.Data.Status);
        Assert.NotNull(checkInResult.Data.CheckedInAt);

        // 4. Security checks out visitor upon departure
        var checkOutResp = await SendAuthorizedAsync(HttpMethod.Patch, $"/api/v1/visitors/{visitorId}/check-out", staffToken);
        Assert.Equal(HttpStatusCode.OK, checkOutResp.StatusCode);
        var checkOutResult = await DeserializeAsync<VisitorDetailDto>(checkOutResp);
        Assert.NotNull(checkOutResult?.Data);
        Assert.Equal("CheckedOut", checkOutResult.Data.Status);
        Assert.NotNull(checkOutResult.Data.CheckedOutAt);
    }

    [Fact]
    public async Task AuditLog_RecordsSystemOperations_WithDiffs()
    {
        var adminToken = await GetAdminTokenAsync();

        // Query audit logs
        var auditResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/audit-logs", adminToken);
        Assert.Equal(HttpStatusCode.OK, auditResp.StatusCode);
        var auditResult = await DeserializeAsync<PagedResult<AuditLogSummaryDto>>(auditResp);
        Assert.NotNull(auditResult?.Data);
        Assert.NotEmpty(auditResult.Data.Items);

        // Fetch detail of the latest audit log entry
        var latestId = auditResult.Data.Items.First().Id;
        var detailResp = await SendAuthorizedAsync(HttpMethod.Get, $"/api/v1/audit-logs/{latestId}", adminToken);
        Assert.Equal(HttpStatusCode.OK, detailResp.StatusCode);
        var detailResult = await DeserializeAsync<AuditLogDetailDto>(detailResp);
        Assert.NotNull(detailResult?.Data);
        Assert.NotEmpty(detailResult.Data.Action);
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

    private async Task<UserSummaryDto> RegisterUserAsync(string email, string fullName, string password)
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

        var result = await DeserializeAsync<AuthResponseDto>(response);
        return new UserSummaryDto
        {
            Id = result!.Data!.UserId,
            Email = result.Data.Email,
            FullName = result.Data.FullName,
            Role = result.Data.Role
        };
    }

    private async Task<UserDetailDto> CreateStaffUserAsync(string adminToken, string email, string password)
    {
        var payload = new CreateUserRequestDto
        {
            FullName = "Staff Member",
            Email = email,
            PhoneNumber = "+1555000111",
            InitialPassword = password,
            Role = "Staff"
        };
        var response = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/users", adminToken, payload);
        response.EnsureSuccessStatusCode();
        var result = await DeserializeAsync<UserDetailDto>(response);
        return result!.Data!;
    }

    private async Task<PropertyDetailDto> CreateTestPropertyAsync(string adminToken)
    {
        var payload = new CreatePropertyRequest
        {
            Name = $"Complex {Guid.NewGuid():N}",
            Address = "100 Operational Way",
            City = "Dallas",
            Country = "USA",
            PropertyType = "Residential"
        };
        var response = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/properties", adminToken, payload);
        response.EnsureSuccessStatusCode();
        var result = await DeserializeAsync<PropertyDetailDto>(response);
        return result!.Data!;
    }

    private async Task<BuildingDetailDto> CreateTestBuildingAsync(string adminToken, Guid propertyId)
    {
        var payload = new CreateBuildingRequest
        {
            Name = $"Block-{Guid.NewGuid():N}"[..12],
            FloorCount = 10
        };
        var response = await SendAuthorizedAsync(HttpMethod.Post, $"/api/v1/properties/{propertyId}/buildings", adminToken, payload);
        response.EnsureSuccessStatusCode();
        var result = await DeserializeAsync<BuildingDetailDto>(response);
        return result!.Data!;
    }

    private async Task<ApartmentDetailDto> CreateTestApartmentAsync(string adminToken, Guid buildingId, string number)
    {
        var payload = new CreateApartmentRequest
        {
            ApartmentNumber = number,
            Floor = 2,
            NumberOfBedrooms = 2,
            NumberOfBathrooms = 2
        };
        var response = await SendAuthorizedAsync(HttpMethod.Post, $"/api/v1/buildings/{buildingId}/apartments", adminToken, payload);
        response.EnsureSuccessStatusCode();
        var result = await DeserializeAsync<ApartmentDetailDto>(response);
        return result!.Data!;
    }

    private async Task<ResidentDetailDto> AssignResidentAsync(string adminToken, Guid userId, Guid apartmentId)
    {
        var payload = new CreateResidentRequest
        {
            UserId = userId,
            ApartmentId = apartmentId,
            MoveInDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        var response = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/residents", adminToken, payload);
        response.EnsureSuccessStatusCode();
        var result = await DeserializeAsync<ResidentDetailDto>(response);
        return result!.Data!;
    }

    private async Task<StaffDetailDto> OnboardStaffAsync(string adminToken, Guid userId, Guid propertyId, string position)
    {
        var payload = new CreateStaffRequest
        {
            UserId = userId,
            PropertyId = propertyId,
            EmployeeNumber = $"EMP-{Guid.NewGuid():N}"[..12],
            Position = position
        };
        var response = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/staff", adminToken, payload);
        response.EnsureSuccessStatusCode();
        var result = await DeserializeAsync<StaffDetailDto>(response);
        return result!.Data!;
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
}

