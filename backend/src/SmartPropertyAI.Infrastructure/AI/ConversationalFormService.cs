using System.Text.Json;
using System.Text.RegularExpressions;
using SmartPropertyAI.Application.Features.AI;
using SmartPropertyAI.Application.Features.Conversations.DTOs;
using SmartPropertyAI.Domain.Entities;

namespace SmartPropertyAI.Infrastructure.AI;

public class ConversationalFormService : IConversationalFormService
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public Task<FormProcessingResult> ProcessFormTurnAsync(
        ConversationWorkflow workflow,
        string userMessage,
        string role,
        CancellationToken ct = default)
    {
        var collected = DeserializeDict(workflow.CollectedFieldsJson);

        if (string.Equals(workflow.WorkflowType, "CreateMaintenanceRequest", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(ProcessMaintenanceRequestForm(collected, userMessage));
        }

        if (string.Equals(workflow.WorkflowType, "RegisterVisitor", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(ProcessVisitorRegistrationForm(collected, userMessage));
        }

        // Generic fallback
        return Task.FromResult(new FormProcessingResult
        {
            IsComplete = true,
            ReplyMessage = "I am ready to assist you. How can I help with your property today?",
            CollectedFieldsJson = workflow.CollectedFieldsJson,
            MissingFieldsJson = "[]"
        });
    }

    private static FormProcessingResult ProcessMaintenanceRequestForm(
        Dictionary<string, string> collected,
        string userMessage)
    {
        // 1. Infer Category if not yet known
        if (!collected.ContainsKey("category"))
        {
            collected["category"] = InferCategory(userMessage);
        }

        // 2. Infer or update Title
        if (!collected.ContainsKey("title"))
        {
            collected["title"] = GenerateTitle(userMessage, collected["category"]);
        }

        // 3. Append to Description
        if (!collected.ContainsKey("description") || string.IsNullOrWhiteSpace(collected["description"]))
        {
            collected["description"] = userMessage.Trim();
        }
        else if (!collected["description"].Contains(userMessage.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            collected["description"] = $"{collected["description"]}. {userMessage.Trim()}";
        }

        // 4. Infer Priority
        var inferredPriority = InferPriority(userMessage);
        if (inferredPriority != null)
        {
            collected["priority"] = inferredPriority;
        }

        var missing = new List<string>();
        if (!collected.ContainsKey("priority"))
        {
            missing.Add("priority");
        }

        // If priority is still missing, ask targeted prompt
        if (missing.Count > 0)
        {
            var cat = collected["category"];
            var prompt = $"I can help you report that {cat.ToLowerInvariant()} issue. " +
                         $"How urgent is this problem (Low, Medium, High, or Urgent), " +
                         $"and is there any additional detail you'd like to include?";

            return new FormProcessingResult
            {
                IsComplete = false,
                ReplyMessage = prompt,
                CollectedFieldsJson = JsonSerializer.Serialize(collected),
                MissingFieldsJson = JsonSerializer.Serialize(missing)
            };
        }

        // All required fields satisfied
        var finalCategory = collected["category"];
        var finalPriority = collected["priority"];
        var finalTitle = collected["title"];
        var finalDescription = collected["description"];

        var pendingAction = new PendingActionDto
        {
            ActionType = "CreateMaintenanceRequest",
            Summary = $"{finalPriority}-priority {finalCategory} ticket: {finalTitle}",
            Parameters = new Dictionary<string, object?>
            {
                ["category"] = finalCategory,
                ["priority"] = finalPriority,
                ["title"] = finalTitle,
                ["description"] = finalDescription
            }
        };

        var confirmationReply =
            $"I have prepared your maintenance ticket:\n" +
            $"• Category: {finalCategory}\n" +
            $"• Issue: {finalTitle}\n" +
            $"• Priority: {finalPriority}\n" +
            $"• Details: {finalDescription}\n\n" +
            $"Would you like me to submit this request now?";

        return new FormProcessingResult
        {
            IsComplete = true,
            ReplyMessage = confirmationReply,
            CollectedFieldsJson = JsonSerializer.Serialize(collected),
            MissingFieldsJson = "[]",
            PendingAction = pendingAction
        };
    }

    private static FormProcessingResult ProcessVisitorRegistrationForm(
        Dictionary<string, string> collected,
        string userMessage)
    {
        // 1. Extract Visitor Name
        if (!collected.ContainsKey("visitorName"))
        {
            var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase) 
            { 
                "dinner", "lunch", "tomorrow", "tonight", "today", "work", "visit", 
                "visiting", "meeting", "coming", "a visit", "food", "guest", "visitor",
                "have", "please", "register", "pass", "help", "need", "for"
            };

            var nameMatch = Regex.Match(userMessage, @"(?:name\s+is|named|called|visitor\s+is|guest\s+is|visitor\s+pass\s+for|pass\s+for|for\s+visitor|for\s+guest)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)", RegexOptions.IgnoreCase);
            if (nameMatch.Success)
            {
                var candidate = nameMatch.Groups[1].Value.Trim().TrimEnd('.', ',');
                var words = candidate.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var validWords = new List<string>();
                foreach (var w in words)
                {
                    if (stopWords.Contains(w)) break;
                    validWords.Add(w);
                }
                if (validWords.Count > 0)
                {
                    collected["visitorName"] = string.Join(" ", validWords);
                }
            }
            else
            {
                var trimmed = userMessage.Trim().TrimEnd('.', ',');
                var words = trimmed.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (words.Length is >= 1 and <= 3 && !words.Any(w => stopWords.Contains(w)))
                {
                    collected["visitorName"] = trimmed;
                }
            }
        }

        // 2. Purpose
        if (!collected.ContainsKey("purpose"))
        {
            if (userMessage.Contains("delivery", StringComparison.OrdinalIgnoreCase)) collected["purpose"] = "Delivery";
            else if (userMessage.Contains("contractor", StringComparison.OrdinalIgnoreCase) || userMessage.Contains("repair", StringComparison.OrdinalIgnoreCase)) collected["purpose"] = "Contractor Work";
            else collected["purpose"] = "Social Visit";
        }

        // 3. Expected Arrival
        if (!collected.ContainsKey("expectedArrival"))
        {
            collected["expectedArrival"] = DateTime.UtcNow.AddHours(2).ToString("o");
        }

        var missing = new List<string>();
        if (!collected.ContainsKey("visitorName"))
        {
            missing.Add("visitorName");
        }

        if (missing.Count > 0)
        {
            return new FormProcessingResult
            {
                IsComplete = false,
                ReplyMessage = "I would be happy to register your guest. What is the visitor's full name?",
                CollectedFieldsJson = JsonSerializer.Serialize(collected),
                MissingFieldsJson = JsonSerializer.Serialize(missing)
            };
        }

        var visitorName = collected["visitorName"];
        var purpose = collected["purpose"];
        var arrival = collected["expectedArrival"];

        var pendingAction = new PendingActionDto
        {
            ActionType = "RegisterVisitor",
            Summary = $"Visitor Pass for {visitorName} ({purpose})",
            Parameters = new Dictionary<string, object?>
            {
                ["visitorName"] = visitorName,
                ["purpose"] = purpose,
                ["expectedArrival"] = arrival
            }
        };

        var confirmationReply =
            $"I have prepared a visitor pass:\n" +
            $"• Guest: {visitorName}\n" +
            $"• Purpose: {purpose}\n" +
            $"• Expected Arrival: {DateTime.Parse(arrival):g} UTC\n\n" +
            $"Would you like me to register this visitor pass now?";

        return new FormProcessingResult
        {
            IsComplete = true,
            ReplyMessage = confirmationReply,
            CollectedFieldsJson = JsonSerializer.Serialize(collected),
            MissingFieldsJson = "[]",
            PendingAction = pendingAction
        };
    }

    private static string InferCategory(string text)
    {
        var lower = text.ToLowerInvariant();
        if (lower.Contains("pipe") || lower.Contains("leak") || lower.Contains("water") ||
            lower.Contains("toilet") || lower.Contains("sink") || lower.Contains("faucet") ||
            lower.Contains("drain") || lower.Contains("plumb"))
            return "Plumbing";

        if (lower.Contains("electric") || lower.Contains("power") || lower.Contains("light") ||
            lower.Contains("outlet") || lower.Contains("bulb") || lower.Contains("switch"))
            return "Electrical";

        if (lower.Contains("ac") || lower.Contains("air condition") || lower.Contains("heat") ||
            lower.Contains("heater") || lower.Contains("hvac") || lower.Contains("vent"))
            return "HVAC";

        if (lower.Contains("clean") || lower.Contains("trash") || lower.Contains("garbage") ||
            lower.Contains("smell") || lower.Contains("odor"))
            return "Cleaning";

        if (lower.Contains("lock") || lower.Contains("door") || lower.Contains("security") ||
            lower.Contains("key") || lower.Contains("intercom"))
            return "Security";

        if (lower.Contains("wall") || lower.Contains("roof") || lower.Contains("ceiling") ||
            lower.Contains("floor") || lower.Contains("window") || lower.Contains("structural"))
            return "Structural";

        return "Other";
    }

    private static string? InferPriority(string text)
    {
        var lower = text.ToLowerInvariant();
        if (lower.Contains("urgent") || lower.Contains("emergency") || lower.Contains("flooding") ||
            lower.Contains("burst") || lower.Contains("fire") || lower.Contains("sparks"))
            return "Urgent";

        if (lower.Contains("high") || lower.Contains("fast") || lower.Contains("severe") ||
            lower.Contains("bucket") || lower.Contains("danger") || lower.Contains("badly"))
            return "High";

        if (lower.Contains("medium") || lower.Contains("moderate") || lower.Contains("normal"))
            return "Medium";

        if (lower.Contains("low") || lower.Contains("minor") || lower.Contains("small") ||
            lower.Contains("slow") || lower.Contains("drip") || lower.Contains("cosmetic"))
            return "Low";

        return null;
    }

    private static string GenerateTitle(string text, string category)
    {
        var cleaned = Regex.Replace(text, @"^(there is|i have|my|our|we have)\s+", "", RegexOptions.IgnoreCase).Trim();
        if (cleaned.Length > 50)
        {
            cleaned = cleaned.Substring(0, 47) + "...";
        }
        return string.IsNullOrWhiteSpace(cleaned) ? $"{category} Issue" : char.ToUpperInvariant(cleaned[0]) + cleaned.Substring(1);
    }

    private static Dictionary<string, string> DeserializeDict(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json, JsonOpts) ?? new();
        }
        catch
        {
            return new();
        }
    }
}
