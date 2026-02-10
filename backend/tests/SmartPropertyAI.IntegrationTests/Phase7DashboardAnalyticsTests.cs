using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Analytics.DTOs;
using SmartPropertyAI.Application.Features.Apartments.DTOs;
using SmartPropertyAI.Application.Features.Authentication.DTOs;
using SmartPropertyAI.Application.Features.Buildings.DTOs;
using SmartPropertyAI.Application.Features.Dashboard.DTOs;
using SmartPropertyAI.Application.Features.Maintenance.DTOs;
using SmartPropertyAI.Application.Features.Notifications;
using SmartPropertyAI.Application.Features.Notifications.DTOs;
using SmartPropertyAI.Application.Features.Properties.DTOs;
using SmartPropertyAI.Application.Features.Residents.DTOs;
using SmartPropertyAI.Application.Features.Staff.DTOs;
using SmartPropertyAI.Application.Features.Users.DTOs;
using SmartPropertyAI.Application.Features.Visitors.DTOs;
using SmartPropertyAI.Domain.Enums;
using Xunit;

namespace SmartPropertyAI.IntegrationTests;

[Collection("IntegrationTests")]
public class Phase7DashboardAnalyticsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public Phase7DashboardAnalyticsTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task AdminDashboard_ReturnsCorrectSummary_AndRequiresAdminRole()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Setup Property, Building, Apartment, Resident
        var property = await CreateTestPropertyAsync(adminToken);
        var building = await CreateTestBuildingAsync(adminToken, property.Id);
        var apartment = await CreateTestApartmentAsync(adminToken, building.Id, "701");

        var residentEmail = $"dash_res_{Guid.NewGuid():N}@smartproperty.ai";
        const string resPassword = "ResidentPassword123!";
        var residentUser = await RegisterUserAsync(residentEmail, "Dashboard Resident", resPassword);
        await AssignResidentAsync(adminToken, residentUser.Id, apartment.Id);

        var residentToken = await LoginAsync(residentEmail, resPassword);

        // 2. As Admin, call GET /api/v1/dashboard/admin
        var adminDashResp = await SendAuthorizedAsync(HttpMethod.Get, $"/api/v1/dashboard/admin?propertyId={property.Id}", adminToken);
        Assert.Equal(HttpStatusCode.OK, adminDashResp.StatusCode);

        var adminDash = await DeserializeAsync<AdminDashboardDto>(adminDashResp);
        Assert.NotNull(adminDash?.Data);
        Assert.True(adminDash.Data.TotalProperties >= 1);
        Assert.True(adminDash.Data.TotalBuildings >= 1);
        Assert.True(adminDash.Data.TotalApartments >= 1);

        // 3. As Resident, call GET /api/v1/dashboard/admin -> must return 403 Forbidden
        var forbiddenResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/dashboard/admin", residentToken);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResp.StatusCode);
    }

    [Fact]
    public async Task StaffDashboard_ReturnsAssignedTasks_ForCallingStaff()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Setup hierarchy
        var property = await CreateTestPropertyAsync(adminToken);
        var building = await CreateTestBuildingAsync(adminToken, property.Id);
        var apartment = await CreateTestApartmentAsync(adminToken, building.Id, "702");

        var residentEmail = $"dash_res2_{Guid.NewGuid():N}@smartproperty.ai";
        const string resPassword = "ResidentPassword123!";
        var residentUser = await RegisterUserAsync(residentEmail, "Alice Resident", resPassword);
        await AssignResidentAsync(adminToken, residentUser.Id, apartment.Id);
        var residentToken = await LoginAsync(residentEmail, resPassword);

        // 2. Onboard Staff
        var staffEmail = $"dash_staff_{Guid.NewGuid():N}@smartproperty.ai";
        const string staffPassword = "StaffPassword123!";
        var staffUser = await CreateStaffUserAsync(adminToken, staffEmail, staffPassword);
        var staff = await OnboardStaffAsync(adminToken, staffUser.Id, property.Id, "Maintenance Technician");

        var staffToken = await LoginAsync(staffEmail, staffPassword);

        // 3. Resident submits ticket
        var ticketPayload = new CreateMaintenanceRequest
        {
            Title = "Kitchen Pipe Leak",
            Description = "Water dripping under kitchen sink",
            Category = "Plumbing",
            Priority = "High"
        };
        var ticketResp = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/maintenance", residentToken, ticketPayload);
        var ticket = await DeserializeAsync<MaintenanceRequestDetailDto>(ticketResp);
        var ticketId = ticket!.Data!.Id;

        // 4. Admin assigns ticket to staff
        var assignResp = await SendAuthorizedAsync(HttpMethod.Patch, $"/api/v1/maintenance/{ticketId}/assign", adminToken, new AssignMaintenanceRequest { StaffId = staff.Id });
        Assert.Equal(HttpStatusCode.OK, assignResp.StatusCode);

        // 5. Staff calls GET /api/v1/dashboard/staff
        var staffDashResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/dashboard/staff", staffToken);
        Assert.Equal(HttpStatusCode.OK, staffDashResp.StatusCode);

        var staffDash = await DeserializeAsync<StaffDashboardDto>(staffDashResp);
        Assert.NotNull(staffDash?.Data);
        Assert.True(staffDash.Data.AssignedTasksCount >= 1);
        Assert.Contains(staffDash.Data.Tasks, t => t.Id == ticketId);

        // 6. Resident calls GET /api/v1/dashboard/staff -> 403 Forbidden
        var forbiddenResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/dashboard/staff", residentToken);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResp.StatusCode);
    }

    [Fact]
    public async Task ResidentDashboard_ReturnsApartmentAndTickets_ForCallingResident()
    {
        var adminToken = await GetAdminTokenAsync();

        // 1. Setup hierarchy
        var property = await CreateTestPropertyAsync(adminToken);
        var building = await CreateTestBuildingAsync(adminToken, property.Id);
        var apartment = await CreateTestApartmentAsync(adminToken, building.Id, "703");

        var residentEmail = $"dash_res3_{Guid.NewGuid():N}@smartproperty.ai";
        const string resPassword = "ResidentPassword123!";
        var residentUser = await RegisterUserAsync(residentEmail, "Bob Resident", resPassword);
        await AssignResidentAsync(adminToken, residentUser.Id, apartment.Id);

        var residentToken = await LoginAsync(residentEmail, resPassword);

        // 2. Submit ticket
        var ticketPayload = new CreateMaintenanceRequest
        {
            Title = "Bedroom Window Jammed",
            Description = "Cannot open window",
            Category = "Structural",
            Priority = "Medium"
        };
        await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/maintenance", residentToken, ticketPayload);

        // 3. Pre-register visitor
        var visitorPayload = new CreateVisitorRequest
        {
            VisitorName = "Clara Oswald",
            VisitorPhone = "+15559876543",
            Purpose = "Dinner",
            ExpectedArrival = DateTime.UtcNow.AddHours(2),
            ExpectedDeparture = DateTime.UtcNow.AddHours(5)
        };
        await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/visitors", residentToken, visitorPayload);

        // 4. Resident calls GET /api/v1/dashboard/resident
        var resDashResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/dashboard/resident", residentToken);
        Assert.Equal(HttpStatusCode.OK, resDashResp.StatusCode);

        var resDash = await DeserializeAsync<ResidentDashboardDto>(resDashResp);
        Assert.NotNull(resDash?.Data);
        Assert.Equal("Bob Resident", resDash.Data.ResidentName);
        Assert.Equal("703", resDash.Data.ApartmentNumber);
        Assert.NotEmpty(resDash.Data.ActiveMaintenanceRequests);
        Assert.NotEmpty(resDash.Data.UpcomingVisitors);

        // 5. Admin calls GET /api/v1/dashboard/resident -> 403 Forbidden
        var forbiddenResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/dashboard/resident", adminToken);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResp.StatusCode);
    }

    [Fact]
    public async Task Analytics_Maintenance_Visitors_Occupancy_ReturnsAggregatedData()
    {
        var adminToken = await GetAdminTokenAsync();

        var residentEmail = $"dash_res4_{Guid.NewGuid():N}@smartproperty.ai";
        const string resPassword = "ResidentPassword123!";
        await RegisterUserAsync(residentEmail, "Dana Resident", resPassword);
        var residentToken = await LoginAsync(residentEmail, resPassword);

        // 1. Maintenance Analytics
        var maintAnalyticsResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/analytics/maintenance", adminToken);
        Assert.Equal(HttpStatusCode.OK, maintAnalyticsResp.StatusCode);
        var maintAnalytics = await DeserializeAsync<MaintenanceAnalyticsDto>(maintAnalyticsResp);
        Assert.NotNull(maintAnalytics?.Data);
        Assert.NotNull(maintAnalytics.Data.ByCategory);
        Assert.NotNull(maintAnalytics.Data.ByPriority);

        // 2. Visitor Analytics
        var visitorAnalyticsResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/analytics/visitors", adminToken);
        Assert.Equal(HttpStatusCode.OK, visitorAnalyticsResp.StatusCode);
        var visitorAnalytics = await DeserializeAsync<VisitorAnalyticsDto>(visitorAnalyticsResp);
        Assert.NotNull(visitorAnalytics?.Data);
        Assert.NotEmpty(visitorAnalytics.Data.PeakHour);

        // 3. Occupancy Analytics
        var occAnalyticsResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/analytics/occupancy", adminToken);
        Assert.Equal(HttpStatusCode.OK, occAnalyticsResp.StatusCode);
        var occAnalytics = await DeserializeAsync<OccupancyAnalyticsDto>(occAnalyticsResp);
        Assert.NotNull(occAnalytics?.Data);
        Assert.True(occAnalytics.Data.TotalUnits >= 0);

        // 4. Role Guard: Resident accessing analytics must receive 403 Forbidden
        var forbiddenResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/analytics/maintenance", residentToken);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResp.StatusCode);
    }

    [Fact]
    public async Task Notifications_FullLifecycle_CreateReadAndMarkAllAsRead()
    {
        var residentEmail = $"dash_res5_{Guid.NewGuid():N}@smartproperty.ai";
        const string resPassword = "ResidentPassword123!";
        var residentUser = await RegisterUserAsync(residentEmail, "Evan Resident", resPassword);
        var residentToken = await LoginAsync(residentEmail, resPassword);

        // Directly create 3 notifications via scoped INotificationService
        using (var scope = _factory.Services.CreateScope())
        {
            var notifService = scope.ServiceProvider.GetRequiredService<INotificationService>();
            await notifService.CreateNotificationAsync(residentUser.Id, "Notice 1", "Welcome to SmartProperty!", NotificationType.Information);
            await notifService.CreateNotificationAsync(residentUser.Id, "Notice 2", "Scheduled water shutdown tomorrow", NotificationType.Alert);
            await notifService.CreateNotificationAsync(residentUser.Id, "Notice 3", "Package arrived at reception", NotificationType.Information);
        }

        // 1. Query notifications
        var listResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/notifications", residentToken);
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var list = await DeserializeAsync<PagedResult<NotificationDto>>(listResp);
        Assert.NotNull(list?.Data);
        Assert.Equal(3, list.Data.TotalCount);

        var firstId = list!.Data!.Items.First().Id;

        // 2. Mark single notification as read
        var readResp = await SendAuthorizedAsync(HttpMethod.Patch, $"/api/v1/notifications/{firstId}/read", residentToken);
        Assert.Equal(HttpStatusCode.OK, readResp.StatusCode);
        var readNotif = await DeserializeAsync<NotificationDto>(readResp);
        Assert.True(readNotif?.Data?.IsRead);
        Assert.NotNull(readNotif!.Data!.ReadAt);

        // 3. Query unread only -> should be 2
        var unreadResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/notifications?unreadOnly=true", residentToken);
        var unreadList = await DeserializeAsync<PagedResult<NotificationDto>>(unreadResp);
        Assert.Equal(2, unreadList?.Data?.TotalCount);

        // 4. Mark all as read
        var markAllResp = await SendAuthorizedAsync(HttpMethod.Patch, "/api/v1/notifications/read-all", residentToken);
        Assert.Equal(HttpStatusCode.OK, markAllResp.StatusCode);
        var bulkResult = await DeserializeAsync<BulkReadResultDto>(markAllResp);
        Assert.Equal(2, bulkResult?.Data?.MarkedCount);

        // 5. Query unread again -> 0
        var emptyUnreadResp = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/notifications?unreadOnly=true", residentToken);
        var emptyUnreadList = await DeserializeAsync<PagedResult<NotificationDto>>(emptyUnreadResp);
        Assert.Equal(0, emptyUnreadList?.Data?.TotalCount);
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private async Task<string> GetAdminTokenAsync()
    {
        return await LoginAsync("admin@smartproperty.ai", "AdminPassword123!");
    }

    private async Task<string> LoginAsync(string email, string password)
    {
        var response = await _client.PostAsync("/api/v1/auth/login", CreateJsonContent(new { email, password }));
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
            Name = $"Phase7 Prop {Guid.NewGuid():N}"[..20],
            Address = "100 Dashboard Way",
            City = "Metropolis",
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
            Name = $"Building-{Guid.NewGuid():N}"[..12],
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
