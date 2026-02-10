# SmartProperty AI - API Specification

Base Route: `/api/v1`

## Standard Envelope Responses

### Success Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "errors": []
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    {
      "field": "description",
      "message": "Description is required"
    }
  ]
}
```

## Endpoint Matrix

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| **System** | | | |
| GET | `/health` | Anonymous | Health check probe |
| GET | `/api/v1/system/status` | Anonymous | Version & UTC timestamp |
| **Authentication** | | | |
| POST | `/api/v1/auth/register` | Anonymous | Register resident |
| POST | `/api/v1/auth/login` | Anonymous | Login & issue JWT/refresh tokens |
| POST | `/api/v1/auth/refresh` | Anonymous | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Authenticated | Revoke refresh token |
| POST | `/api/v1/auth/change-password` | Authenticated | Update password |
| GET | `/api/v1/auth/me` | Authenticated | Current user profile & claims |
| **User Administration** | | | |
| GET | `/api/v1/users` | Administrator | List users with pagination |
| GET | `/api/v1/users/{id}` | Admin / Self | Get user profile |
| POST | `/api/v1/users` | Administrator | Create staff/admin/resident |
| PUT | `/api/v1/users/{id}` | Admin / Self | Update profile |
| PATCH | `/api/v1/users/{id}/status` | Administrator | Activate/deactivate user |
| PATCH | `/api/v1/users/{id}/role` | Administrator | Assign role |
| **Properties & Units** | | | |
| GET | `/api/v1/properties` | Admin / Staff / Resident | List properties |
| GET | `/api/v1/properties/{id}` | Admin / Staff / Resident | Get property details |
| POST | `/api/v1/properties` | Administrator | Create property |
| PUT | `/api/v1/properties/{id}` | Administrator | Update property |
| DELETE | `/api/v1/properties/{id}` | Administrator | Archive property |
| GET | `/api/v1/properties/{propertyId}/buildings` | Admin / Staff / Resident | List buildings |
| GET | `/api/v1/buildings/{id}` | Admin / Staff / Resident | Get building details |
| POST | `/api/v1/properties/{propertyId}/buildings` | Administrator | Create building |
| PUT | `/api/v1/buildings/{id}` | Administrator | Update building |
| DELETE | `/api/v1/buildings/{id}` | Administrator | Archive building |
| GET | `/api/v1/buildings/{buildingId}/apartments` | Admin / Staff | List apartments |
| GET | `/api/v1/apartments/{id}` | Admin / Staff / Resident (owner) | Get apartment details |
| POST | `/api/v1/buildings/{buildingId}/apartments` | Administrator | Create apartment |
| PUT | `/api/v1/apartments/{id}` | Administrator | Update apartment |
| PATCH | `/api/v1/apartments/{id}/occupancy` | Admin / Staff | Update occupancy status |
| **Residents & Staff** | | | |
| GET | `/api/v1/residents` | Administrator | List residents |
| GET | `/api/v1/residents/{id}` | Admin / Self | Get resident details |
| POST | `/api/v1/residents` | Administrator | Assign user to apartment |
| PUT | `/api/v1/residents/{id}` | Admin / Self | Update resident profile |
| GET | `/api/v1/residents/me` | Resident | Current resident profile |
| GET | `/api/v1/residents/{id}/apartment` | Admin / Staff / Self | Get resident apartment |
| GET | `/api/v1/staff` | Administrator | List staff members |
| GET | `/api/v1/staff/{id}` | Admin / Self | Get staff details |
| POST | `/api/v1/staff` | Administrator | Assign staff to property |
| PUT | `/api/v1/staff/{id}` | Administrator | Update staff |
| GET | `/api/v1/staff/me/tasks` | Staff | Assigned task overview |
| **Maintenance** | | | |
| POST | `/api/v1/maintenance` | Resident / Admin | Create work order |
| GET | `/api/v1/maintenance` | Admin / Staff | List authorized requests |
| GET | `/api/v1/maintenance/{id}` | Admin / Assigned Staff / Creator | Get request details |
| PUT | `/api/v1/maintenance/{id}` | Administrator | Update request |
| PATCH | `/api/v1/maintenance/{id}/status` | Admin / Staff | Update status |
| PATCH | `/api/v1/maintenance/{id}/assign` | Administrator | Assign staff member |
| POST | `/api/v1/maintenance/{id}/notes` | Admin / Staff / Resident | Add progress note |
| GET | `/api/v1/maintenance/{id}/history` | Authorized | Status transition trail |
| GET | `/api/v1/maintenance/my-requests` | Resident | Resident tickets |
| GET | `/api/v1/maintenance/assigned-to-me` | Staff | Staff assignments |
| **Visitors** | | | |
| POST | `/api/v1/visitors` | Resident | Register visitor pass |
| GET | `/api/v1/visitors` | Admin / Staff | List visitor records |
| GET | `/api/v1/visitors/{id}` | Authorized | Get visitor details |
| PUT | `/api/v1/visitors/{id}` | Resident / Admin | Update visitor record |
| PATCH | `/api/v1/visitors/{id}/approve` | Admin / Security | Approve visitor pass |
| PATCH | `/api/v1/visitors/{id}/reject` | Admin / Security | Reject visitor pass |
| PATCH | `/api/v1/visitors/{id}/check-in` | Admin / Security | Record check-in |
| PATCH | `/api/v1/visitors/{id}/check-out` | Admin / Security | Record check-out |
| GET | `/api/v1/visitors/my-visitors` | Resident | Resident visitor list |
| **Conversational AI** | | | |
| POST | `/api/v1/ai/chat` | Authenticated | Send natural language message |
| POST | `/api/v1/ai/conversations` | Authenticated | Start new conversation session |
| GET | `/api/v1/ai/conversations` | Authenticated | List user's conversations |
| GET | `/api/v1/ai/conversations/{id}` | Authenticated (Owner) | Get conversation details |
| GET | `/api/v1/ai/conversations/{id}/messages` | Authenticated (Owner) | Get message transcript |
| POST | `/api/v1/ai/conversations/{id}/messages` | Authenticated (Owner) | Append message to session |
| POST | `/api/v1/ai/conversations/{id}/confirm` | Authenticated (Owner) | Confirm and execute pending action |
| POST | `/api/v1/ai/conversations/{id}/cancel` | Authenticated (Owner) | Cancel pending action |
| DELETE | `/api/v1/ai/conversations/{id}` | Authenticated (Owner) | Archive conversation |
| **Dashboards & Analytics** | | | |
| GET | `/api/v1/dashboard/admin` | Administrator | Admin executive overview |
| GET | `/api/v1/dashboard/staff` | Staff | Staff operational tasks |
| GET | `/api/v1/dashboard/resident` | Resident | Resident dashboard |
| GET | `/api/v1/analytics/maintenance` | Administrator | Maintenance KPI statistics |
| GET | `/api/v1/analytics/visitors` | Administrator | Visitor throughput statistics |
| GET | `/api/v1/analytics/occupancy` | Administrator | Unit occupancy analytics |
| **Notifications** | | | |
| GET | `/api/v1/notifications` | Authenticated | User notifications |
| GET | `/api/v1/notifications/{id}` | Authenticated (Owner) | Get notification details |
| PATCH | `/api/v1/notifications/{id}/read` | Authenticated (Owner) | Mark notification as read |
| PATCH | `/api/v1/notifications/read-all` | Authenticated | Mark all notifications as read |
| **Audit Logs** | | | |
| GET | `/api/v1/audit-logs` | Administrator | Query audit trail |
| GET | `/api/v1/audit-logs/{id}` | Administrator | Detailed state diff |

