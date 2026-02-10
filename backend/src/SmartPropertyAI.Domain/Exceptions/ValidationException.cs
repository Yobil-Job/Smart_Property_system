namespace SmartPropertyAI.Domain.Exceptions;

public class ValidationException : DomainException
{
    public ValidationException(string message) : base(message)
    {
        Errors = new Dictionary<string, string[]>();
    }

    public ValidationException(string propertyName, string error)
        : base("One or more validation failures have occurred.")
    {
        Errors = new Dictionary<string, string[]>
        {
            { propertyName, new[] { error } }
        };
    }

    public ValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation failures have occurred.")
    {
        Errors = errors;
    }

    public IDictionary<string, string[]> Errors { get; }
}

