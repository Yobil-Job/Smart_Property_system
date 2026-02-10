using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.AI.DTOs;
using SmartPropertyAI.Domain.Constants;

namespace SmartPropertyAI.Infrastructure.AI;

public class AiToolRegistry : IAiToolRegistry
{
    private static readonly Dictionary<string, List<AiToolDefinition>> RoleTools = new(StringComparer.OrdinalIgnoreCase)
    {
        [UserRoles.Resident] = new()
        {
            new AiToolDefinition
            {
                Name = "create_maintenance_request",
                Description = "Report a new maintenance issue for the resident's apartment (e.g. plumbing leak, electrical failure).",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "title": { "type": "string", "description": "Short headline of the issue" },
                    "description": { "type": "string", "description": "Detailed explanation of the issue" },
                    "category": { "type": "string", "enum": ["Plumbing", "Electrical", "HVAC", "Cleaning", "Security", "Structural", "Other"] },
                    "priority": { "type": "string", "enum": ["Low", "Medium", "High", "Urgent"] }
                  },
                  "required": ["title", "description", "category", "priority"]
                }
                """
            },
            new AiToolDefinition
            {
                Name = "get_my_maintenance_requests",
                Description = "Retrieve list of maintenance tickets submitted by the resident.",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string", "enum": ["Pending", "Approved", "Assigned", "InProgress", "Resolved", "Closed", "Rejected"] }
                  }
                }
                """
            },
            new AiToolDefinition
            {
                Name = "get_my_maintenance_request_details",
                Description = "Get detailed status, work history, and notes for a specific maintenance ticket.",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "requestId": { "type": "string", "format": "uuid" }
                  },
                  "required": ["requestId"]
                }
                """
            },
            new AiToolDefinition
            {
                Name = "create_visitor_request",
                Description = "Pre-register an upcoming visitor/guest for building security clearance.",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "visitorName": { "type": "string" },
                    "visitorPhone": { "type": "string" },
                    "purpose": { "type": "string" },
                    "expectedArrival": { "type": "string", "format": "date-time" },
                    "expectedDeparture": { "type": "string", "format": "date-time" }
                  },
                  "required": ["visitorName", "purpose", "expectedArrival"]
                }
                """
            },
            new AiToolDefinition
            {
                Name = "get_my_visitor_requests",
                Description = "Get all registered visitors and passes for the resident's apartment.",
                JsonParametersSchema = """{ "type": "object", "properties": {} }"""
            },
            new AiToolDefinition
            {
                Name = "get_my_apartment_details",
                Description = "Get information about the resident's assigned apartment and building.",
                JsonParametersSchema = """{ "type": "object", "properties": {} }"""
            }
        },

        [UserRoles.Staff] = new()
        {
            new AiToolDefinition
            {
                Name = "get_assigned_maintenance_requests",
                Description = "List all maintenance jobs assigned to the current staff technician.",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string", "enum": ["Assigned", "InProgress", "Resolved"] }
                  }
                }
                """
            },
            new AiToolDefinition
            {
                Name = "update_maintenance_status",
                Description = "Update status of an assigned maintenance request (e.g. InProgress or Resolved).",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "requestId": { "type": "string", "format": "uuid" },
                    "status": { "type": "string", "enum": ["InProgress", "Resolved"] },
                    "reason": { "type": "string" }
                  },
                  "required": ["requestId", "status"]
                }
                """
            },
            new AiToolDefinition
            {
                Name = "add_maintenance_note",
                Description = "Add an internal or public technical progress note to a maintenance ticket.",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "requestId": { "type": "string", "format": "uuid" },
                    "noteText": { "type": "string" },
                    "isInternalOnly": { "type": "boolean" }
                  },
                  "required": ["requestId", "noteText"]
                }
                """
            },
            new AiToolDefinition
            {
                Name = "check_in_visitor",
                Description = "Security front desk check-in for an approved visitor pass.",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "visitorId": { "type": "string", "format": "uuid" }
                  },
                  "required": ["visitorId"]
                }
                """
            },
            new AiToolDefinition
            {
                Name = "check_out_visitor",
                Description = "Security front desk check-out when a visitor departs.",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "visitorId": { "type": "string", "format": "uuid" }
                  },
                  "required": ["visitorId"]
                }
                """
            }
        },

        [UserRoles.Administrator] = new()
        {
            new AiToolDefinition
            {
                Name = "get_all_maintenance_requests",
                Description = "Query all system maintenance tickets with optional status and category filters.",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string" },
                    "category": { "type": "string" }
                  }
                }
                """
            },
            new AiToolDefinition
            {
                Name = "assign_maintenance_request",
                Description = "Assign a pending or approved maintenance ticket to an operational staff technician.",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "requestId": { "type": "string", "format": "uuid" },
                    "staffId": { "type": "string", "format": "uuid" }
                  },
                  "required": ["requestId", "staffId"]
                }
                """
            },
            new AiToolDefinition
            {
                Name = "approve_visitor_request",
                Description = "Approve a pending visitor pass application.",
                JsonParametersSchema = """
                {
                  "type": "object",
                  "properties": {
                    "visitorId": { "type": "string", "format": "uuid" }
                  },
                  "required": ["visitorId"]
                }
                """
            },
            new AiToolDefinition
            {
                Name = "get_visitor_records",
                Description = "Inspect security log of visitor passes.",
                JsonParametersSchema = """{ "type": "object", "properties": {} }"""
            }
        }
    };

    public IReadOnlyList<AiToolDefinition> GetToolsForRole(string role)
    {
        if (RoleTools.TryGetValue(role, out var tools))
        {
            return tools;
        }

        return Array.Empty<AiToolDefinition>();
    }

    public AiToolDefinition? GetTool(string toolName, string role)
    {
        var tools = GetToolsForRole(role);
        return tools.FirstOrDefault(t => string.Equals(t.Name, toolName, StringComparison.OrdinalIgnoreCase));
    }
}

