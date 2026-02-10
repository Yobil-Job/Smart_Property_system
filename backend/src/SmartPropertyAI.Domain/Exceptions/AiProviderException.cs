using System.Net;

namespace SmartPropertyAI.Domain.Exceptions;

public class AiProviderException : DomainException
{
    public HttpStatusCode StatusCode { get; }

    public AiProviderException(string message, HttpStatusCode statusCode = HttpStatusCode.BadGateway)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public AiProviderException(string message, Exception innerException, HttpStatusCode statusCode = HttpStatusCode.BadGateway)
        : base(message, innerException)
    {
        StatusCode = statusCode;
    }
}

