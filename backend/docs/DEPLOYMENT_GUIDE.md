# SmartProperty AI - Deployment Guide

## Prerequisites
- Docker & Docker Compose
- PostgreSQL 16+ (or run via Compose)
- OpenAI API Key

## Configuration Environment Variables

| Variable | Description | Example |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | Environment Name | `Production` or `Development` |
| `ConnectionStrings__DefaultConnection` | PostgreSQL Connection String | `Host=postgres;Port=5432;Database=smartproperty_db;Username=admin;Password=secret` |
| `JwtSettings__SecretKey` | JWT Signing Key (Min 32 chars) | `SuperSecretSigningKeyAtLeast32BytesLong123!` |
| `JwtSettings__Issuer` | Token Issuer | `SmartPropertyAI` |
| `JwtSettings__Audience` | Token Audience | `SmartPropertyAIUsers` |
| `JwtSettings__AccessTokenExpirationMinutes` | Access Token Lifetime | `30` |
| `JwtSettings__RefreshTokenExpirationDays` | Refresh Token Lifetime | `7` |
| `OpenAISettings__ApiKey` | OpenAI API Key | `sk-proj-...` |
| `OpenAISettings__Model` | LLM Model Name | `gpt-4o-mini` |

## Local Docker Compose Deployment
```bash
cd backend
docker-compose up --build -d
```

Verify service health:
```bash
curl http://localhost:5000/health
```

