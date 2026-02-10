using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using SmartPropertyAI.Application.Common;
using SmartPropertyAI.Application.Features.Apartments.DTOs;
using SmartPropertyAI.Application.Features.Authentication.DTOs;
using SmartPropertyAI.Application.Features.Buildings.DTOs;
using SmartPropertyAI.Application.Features.Properties.DTOs;
using SmartPropertyAI.Application.Features.Residents.DTOs;
using SmartPropertyAI.Application.Features.Staff.DTOs;
using SmartPropertyAI.Application.Features.Users.DTOs;
using Xunit;

namespace SmartPropertyAI.IntegrationTests;

[Collection("IntegrationTests")]
public class Phase3PropertyTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public Phase3PropertyTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Admin_CanCreateFullPropertyHierarchy_AndAssignResident_ChangingOccupancyToOccupied()
    {
        // 1. Login as Admin
        var adminToken = await GetAdminTokenAsync();

        // 2. Create Property
        var createPropPayload = new CreatePropertyRequest
        {
            Name = $"Sunset Gardens {Guid.NewGuid():N}",
            Description = "Luxury residential community",
            Address = "100 Ocean Avenue",
            City = "Miami",
            Country = "USA",
            PropertyType = "Residential"
        };

        var propResponse = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/properties", adminToken, createPropPayload);
        Assert.Equal(HttpStatusCode.Created, propResponse.StatusCode);
        var propResult = await DeserializeAsync<PropertyDetailDto>(propResponse);
        Assert.NotNull(propResult?.Data);
        var propertyId = propResult.Data.Id;

        // 3. Create Building in Property
        var createBldgPayload = new CreateBuildingRequest
        {
            Name = "Tower A",
            FloorCount = 10,
            Description = "Oceanfront residential tower"
        };

        var bldgResponse = await SendAuthorizedAsync(HttpMethod.Post, $"/api/v1/properties/{propertyId}/buildings", adminToken, createBldgPayload);
        Assert.Equal(HttpStatusCode.Created, bldgResponse.StatusCode);
        var bldgResult = await DeserializeAsync<BuildingDetailDto>(bldgResponse);
        Assert.NotNull(bldgResult?.Data);
        var buildingId = bldgResult.Data.Id;

        // 4. Create Apartment in Building
        var createAptPayload = new CreateApartmentRequest
        {
            ApartmentNumber = "101",
            Floor = 1,
            NumberOfBedrooms = 2,
            NumberOfBathrooms = 2
        };

        var aptResponse = await SendAuthorizedAsync(HttpMethod.Post, $"/api/v1/buildings/{buildingId}/apartments", adminToken, createAptPayload);
        Assert.Equal(HttpStatusCode.Created, aptResponse.StatusCode);
        var aptResult = await DeserializeAsync<ApartmentDetailDto>(aptResponse);
        Assert.NotNull(aptResult?.Data);
        Assert.Equal("Vacant", aptResult.Data.OccupancyStatus);
        var apartmentId = aptResult.Data.Id;

        // 5. Register a resident user
        var residentEmail = $"resident_{Guid.NewGuid():N}@smartproperty.ai";
        var residentUser = await RegisterUserAsync(residentEmail, "John Resident", "ResidentPassword123!");

        // 6. Assign resident to apartment
        var assignResidentPayload = new CreateResidentRequest
        {
            UserId = residentUser.Id,
            ApartmentId = apartmentId,
            EmergencyContact = "Jane Doe (+1555123456)",
            MoveInDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        var residentResponse = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/residents", adminToken, assignResidentPayload);
        Assert.Equal(HttpStatusCode.Created, residentResponse.StatusCode);
        var residentResult = await DeserializeAsync<ResidentDetailDto>(residentResponse);
        Assert.NotNull(residentResult?.Data);
        Assert.Equal("Active", residentResult.Data.Status);
        Assert.Equal("101", residentResult.Data.ApartmentNumber);

        // 7. Verify apartment is now Occupied
        var verifyAptResponse = await SendAuthorizedAsync(HttpMethod.Get, $"/api/v1/apartments/{apartmentId}", adminToken);
        Assert.Equal(HttpStatusCode.OK, verifyAptResponse.StatusCode);
        var verifyAptResult = await DeserializeAsync<ApartmentDetailDto>(verifyAptResponse);
        Assert.NotNull(verifyAptResult?.Data);
        Assert.Equal("Occupied", verifyAptResult.Data.OccupancyStatus);
    }

    [Fact]
    public async Task DuplicateApartmentNumber_InSameBuilding_Returns_Conflict409()
    {
        var adminToken = await GetAdminTokenAsync();

        // Create Property & Building
        var property = await CreateTestPropertyAsync(adminToken);
        var building = await CreateTestBuildingAsync(adminToken, property.Id);

        // Create first apartment "201"
        var createAptPayload = new CreateApartmentRequest
        {
            ApartmentNumber = "201",
            Floor = 2,
            NumberOfBedrooms = 1,
            NumberOfBathrooms = 1
        };

        var response1 = await SendAuthorizedAsync(HttpMethod.Post, $"/api/v1/buildings/{building.Id}/apartments", adminToken, createAptPayload);
        Assert.Equal(HttpStatusCode.Created, response1.StatusCode);

        // Create duplicate apartment "201" in the same building
        var response2 = await SendAuthorizedAsync(HttpMethod.Post, $"/api/v1/buildings/{building.Id}/apartments", adminToken, createAptPayload);
        Assert.Equal(HttpStatusCode.Conflict, response2.StatusCode);
    }

    [Fact]
    public async Task Resident_CallingMeEndpoint_ReturnsTheirAssignedApartmentProfile()
    {
        var adminToken = await GetAdminTokenAsync();

        // Create Property -> Building -> Apartment
        var property = await CreateTestPropertyAsync(adminToken);
        var building = await CreateTestBuildingAsync(adminToken, property.Id);
        var apartment = await CreateTestApartmentAsync(adminToken, building.Id, "301");

        // Register Resident and assign
        var email = $"res_me_{Guid.NewGuid():N}@smartproperty.ai";
        const string password = "ResidentPass123!";
        var user = await RegisterUserAsync(email, "Sarah Connor", password);

        var assignPayload = new CreateResidentRequest
        {
            UserId = user.Id,
            ApartmentId = apartment.Id,
            EmergencyContact = "John Connor (+1555987654)",
            MoveInDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        var assignResponse = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/residents", adminToken, assignPayload);
        Assert.Equal(HttpStatusCode.Created, assignResponse.StatusCode);

        // Resident logs in
        var residentToken = await LoginAsync(email, password);

        // Call GET /api/v1/residents/me
        var meResponse = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/residents/me", residentToken);
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);

        var meResult = await DeserializeAsync<ResidentDetailDto>(meResponse);
        Assert.NotNull(meResult?.Data);
        Assert.Equal(user.Id, meResult.Data.UserId);
        Assert.Equal("301", meResult.Data.ApartmentNumber);
        Assert.Equal(building.Name, meResult.Data.BuildingName);
        Assert.Equal(property.Name, meResult.Data.PropertyName);
    }

    [Fact]
    public async Task Resident_CannotListAllApartments_OrAllResidents_Returns_Forbidden403()
    {
        var adminToken = await GetAdminTokenAsync();
        var property = await CreateTestPropertyAsync(adminToken);
        var building = await CreateTestBuildingAsync(adminToken, property.Id);

        var email = $"res_forbidden_{Guid.NewGuid():N}@smartproperty.ai";
        const string password = "ResidentPass123!";
        await RegisterUserAsync(email, "Forbidden User", password);
        var residentToken = await LoginAsync(email, password);

        // Resident attempting to list all apartments in building
        var listAptsResponse = await SendAuthorizedAsync(HttpMethod.Get, $"/api/v1/buildings/{building.Id}/apartments", residentToken);
        Assert.Equal(HttpStatusCode.Forbidden, listAptsResponse.StatusCode);

        // Resident attempting to list all residents
        var listResidentsResponse = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/residents", residentToken);
        Assert.Equal(HttpStatusCode.Forbidden, listResidentsResponse.StatusCode);
    }

    [Fact]
    public async Task Admin_CanOnboardStaff_AndStaffCanViewTasksAndApartments()
    {
        var adminToken = await GetAdminTokenAsync();
        var property = await CreateTestPropertyAsync(adminToken);
        var building = await CreateTestBuildingAsync(adminToken, property.Id);
        var apartment = await CreateTestApartmentAsync(adminToken, building.Id, "401");

        // 1. Create Staff User via Admin endpoint
        var staffEmail = $"technician_{Guid.NewGuid():N}@smartproperty.ai";
        const string staffPassword = "StaffPassword123!";
        var createUserPayload = new CreateUserRequestDto
        {
            FullName = "Bob Technician",
            Email = staffEmail,
            PhoneNumber = "+1555444333",
            InitialPassword = staffPassword,
            Role = "Staff"
        };
        var createUserResponse = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/users", adminToken, createUserPayload);
        Assert.Equal(HttpStatusCode.Created, createUserResponse.StatusCode);
        var userResult = await DeserializeAsync<UserDetailDto>(createUserResponse);
        Assert.NotNull(userResult?.Data);

        // 2. Onboard Staff to Property
        var employeeNumber = $"EMP-{Guid.NewGuid():N}"[..12];
        var createStaffPayload = new CreateStaffRequest
        {
            UserId = userResult.Data.Id,
            PropertyId = property.Id,
            EmployeeNumber = employeeNumber,
            Position = "Lead Maintenance Technician"
        };
        var staffResponse = await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/staff", adminToken, createStaffPayload);
        Assert.Equal(HttpStatusCode.Created, staffResponse.StatusCode);
        var staffResult = await DeserializeAsync<StaffDetailDto>(staffResponse);
        Assert.NotNull(staffResult?.Data);
        Assert.Equal("Lead Maintenance Technician", staffResult.Data.Position);

        // 3. Staff logs in
        var staffToken = await LoginAsync(staffEmail, staffPassword);

        // 4. Staff checks their task overview
        var tasksResponse = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/staff/me/tasks", staffToken);
        Assert.Equal(HttpStatusCode.OK, tasksResponse.StatusCode);
        var tasksResult = await DeserializeAsync<StaffTaskOverviewDto>(tasksResponse);
        Assert.NotNull(tasksResult?.Data);
        Assert.Equal(0, tasksResult.Data.ActiveTasksCount);

        // 5. Staff updates apartment occupancy to UnderMaintenance
        var occupancyPayload = new UpdateOccupancyRequest
        {
            OccupancyStatus = "UnderMaintenance",
            Reason = "Electrical wiring inspection"
        };
        var patchResponse = await SendAuthorizedAsync(HttpMethod.Patch, $"/api/v1/apartments/{apartment.Id}/occupancy", staffToken, occupancyPayload);
        Assert.Equal(HttpStatusCode.OK, patchResponse.StatusCode);
        var patchResult = await DeserializeAsync<ApartmentDetailDto>(patchResponse);
        Assert.NotNull(patchResult?.Data);
        Assert.Equal("UnderMaintenance", patchResult.Data.OccupancyStatus);
    }

    [Fact]
    public async Task DeletingProperty_WithActiveResidents_Returns_Conflict409()
    {
        var adminToken = await GetAdminTokenAsync();
        var property = await CreateTestPropertyAsync(adminToken);
        var building = await CreateTestBuildingAsync(adminToken, property.Id);
        var apartment = await CreateTestApartmentAsync(adminToken, building.Id, "501");

        // Register and assign resident
        var email = $"res_del_{Guid.NewGuid():N}@smartproperty.ai";
        var user = await RegisterUserAsync(email, "Protected Resident", "StrongPass123!");
        var assignPayload = new CreateResidentRequest
        {
            UserId = user.Id,
            ApartmentId = apartment.Id,
            MoveInDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        await SendAuthorizedAsync(HttpMethod.Post, "/api/v1/residents", adminToken, assignPayload);

        // Attempting to delete property with active resident
        var deleteResponse = await SendAuthorizedAsync(HttpMethod.Delete, $"/api/v1/properties/{property.Id}", adminToken);
        Assert.Equal(HttpStatusCode.Conflict, deleteResponse.StatusCode);
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

    private async Task<PropertyDetailDto> CreateTestPropertyAsync(string adminToken)
    {
        var payload = new CreatePropertyRequest
        {
            Name = $"Complex {Guid.NewGuid():N}",
            Address = "789 Park Blvd",
            City = "Denver",
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
            FloorCount = 5
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
            Floor = 1,
            NumberOfBedrooms = 2,
            NumberOfBathrooms = 1
        };
        var response = await SendAuthorizedAsync(HttpMethod.Post, $"/api/v1/buildings/{buildingId}/apartments", adminToken, payload);
        response.EnsureSuccessStatusCode();
        var result = await DeserializeAsync<ApartmentDetailDto>(response);
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

