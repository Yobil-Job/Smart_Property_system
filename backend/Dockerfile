FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["SmartPropertyAI.slnx", "./"]
COPY ["src/SmartPropertyAI.Domain/SmartPropertyAI.Domain.csproj", "src/SmartPropertyAI.Domain/"]
COPY ["src/SmartPropertyAI.Application/SmartPropertyAI.Application.csproj", "src/SmartPropertyAI.Application/"]
COPY ["src/SmartPropertyAI.Infrastructure/SmartPropertyAI.Infrastructure.csproj", "src/SmartPropertyAI.Infrastructure/"]
COPY ["src/SmartPropertyAI.API/SmartPropertyAI.API.csproj", "src/SmartPropertyAI.API/"]

RUN dotnet restore "src/SmartPropertyAI.API/SmartPropertyAI.API.csproj"

# Copy entire source tree
COPY . .

# Build and publish
WORKDIR "/src/src/SmartPropertyAI.API"
RUN dotnet publish "SmartPropertyAI.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

RUN mkdir -p wwwroot/uploads/maintenance

ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 5096 10000 80

ENTRYPOINT ["dotnet", "SmartPropertyAI.API.dll"]

