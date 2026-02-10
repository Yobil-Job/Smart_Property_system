using System.Text.RegularExpressions;
using SmartPropertyAI.Application.Features.AI;

namespace SmartPropertyAI.Infrastructure.AI;

public class IntentDetectionService : IIntentDetectionService
{
    private static readonly Regex ConfirmRegex = new(
        @"\b(yes|confirm|submit|proceed|agree|approved|go\s+ahead|do\s+it|please\s+do|sure|ok|okay)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex CancelRegex = new(
        @"\b(no|cancel|stop|abort|discard|never\s*mind|forget\s+it|don't|dont)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex MaintenanceStatusRegex = new(
        @"\b(status\s+of\s+my|check\s+(?:my\s+)?(?:ticket|request|maintenance)|my\s+(?:requests?|tickets?|maintenance)|ticket\s+status|ticket\s+#?REQ-|do\s+i\s+have\s+(?:any\s+)?(?:repairs?|tickets?|maintenance))\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex MaintenanceRegex = new(
        @"\b(leak|leaking|pipe|water|sink|toilet|tap|faucet|ac|air\s+condition|heat|heating|heater|power|electricity|electric|light|bulb|door|lock|window|drain|clog|clogged|broken|repair|maintenance|fix|smell|mold|damage|not\s+working)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex VisitorStatusRegex = new(
        @"\b(do\s+i\s+have\s+(?:any\s+)?visitors?|any\s+(?:visitors?|guests?)|who\s+is\s+visiting|check\s+(?:my\s+)?(?:visitors?|guests?|pass(?:es)?)|(?:my\s+)?(?:upcoming|scheduled|expected|pending)\s+(?:visitors?|guests?)|status\s+of\s+(?:my\s+)?(?:visitors?|guests?|pass(?:es)?)|visitors?\s+(?:this\s+week|today|tomorrow|schedule|list)|who\s+is\s+coming|is\s+anyone\s+visiting|do\s+i\s+have\s+guests?)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex VisitorRegistrationRegex = new(
        @"\b(register\s+(?:a\s+)?(?:visitor|guest|pass)|create\s+(?:a\s+)?(?:visitor|guest|pass)|new\s+(?:visitor|guest|pass)|issue\s+(?:a\s+)?(?:visitor|guest|pass)|book\s+(?:a\s+)?(?:visitor|guest|pass)|invite\s+(?:a\s+)?(?:visitor|guest)|add\s+(?:a\s+)?(?:visitor|guest|pass)|visitor\s+pass\s+for|expecting\s+(?:a\s+)?(?:visitor|guest|contractor|delivery)|friend\s+is\s+visiting|guest\s+named)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex AssignRegex = new(
        @"\b(assign|dispatch|allocate|technician\s+to|send\s+staff)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex AmenityStatusRegex = new(
        @"\b(amenities|amenity|what\s+amenities|list\s+(?:of\s+)?amenities|check\s+(?:my\s+)?(?:bookings?|reservations?)|my\s+(?:amenity|amenities|bookings?|reservations?)|pool\s+hours|gym\s+hours|rooftop\s+hours|bbq\s+hours)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex AmenityBookingRegex = new(
        @"\b(book|reserve|reservation\s+for|booking\s+for)\s+(?:the\s+)?(?:rooftop|bbq|pool|cinema|theater|charger|ev|fitness|gym|amenity)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public Task<string> DetectIntentAsync(string userMessage, string role, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userMessage))
        {
            return Task.FromResult("GeneralHelp");
        }

        var trimmed = userMessage.Trim();

        // 1. Confirmation / Cancellation check
        if (ConfirmRegex.IsMatch(trimmed) && trimmed.Length < 40)
        {
            return Task.FromResult("Confirmation");
        }
        if (CancelRegex.IsMatch(trimmed) && trimmed.Length < 40)
        {
            return Task.FromResult("Cancellation");
        }

        // 2. Status Inquiries (checked before create actions to avoid false triggers)
        if (VisitorStatusRegex.IsMatch(trimmed))
        {
            return Task.FromResult("VisitorStatusInquiry");
        }

        if (MaintenanceStatusRegex.IsMatch(trimmed))
        {
            return Task.FromResult("MaintenanceStatusInquiry");
        }

        if (AmenityStatusRegex.IsMatch(trimmed))
        {
            return Task.FromResult("AmenityStatusInquiry");
        }

        // 3. Action Workflows
        if (AmenityBookingRegex.IsMatch(trimmed))
        {
            return Task.FromResult("BookAmenity");
        }
        if (VisitorRegistrationRegex.IsMatch(trimmed))
        {
            return Task.FromResult("RegisterVisitor");
        }

        if (MaintenanceRegex.IsMatch(trimmed))
        {
            return Task.FromResult("CreateMaintenanceRequest");
        }

        if (AssignRegex.IsMatch(trimmed))
        {
            return Task.FromResult("StaffAssignment");
        }

        return Task.FromResult("GeneralInquiry");
    }
}

