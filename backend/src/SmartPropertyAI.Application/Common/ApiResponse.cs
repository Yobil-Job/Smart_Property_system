namespace SmartPropertyAI.Application.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<ErrorDetail> Errors { get; set; } = new();

    public ApiResponse()
    {
    }

    public ApiResponse(T data, string message = "Operation succeeded")
    {
        Success = true;
        Message = message;
        Data = data;
        Errors = new List<ErrorDetail>();
    }

    public static ApiResponse<T> SuccessResult(T data, string message = "Operation succeeded")
    {
        return new ApiResponse<T>(data, message);
    }

    public static ApiResponse<T> FailureResult(string message, List<ErrorDetail>? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Data = default,
            Errors = errors ?? new List<ErrorDetail>()
        };
    }
}

public class ApiResponse : ApiResponse<object>
{
    public static ApiResponse SuccessResult(string message = "Operation succeeded")
    {
        return new ApiResponse
        {
            Success = true,
            Message = message,
            Data = null,
            Errors = new List<ErrorDetail>()
        };
    }

    public static new ApiResponse FailureResult(string message, List<ErrorDetail>? errors = null)
    {
        return new ApiResponse
        {
            Success = false,
            Message = message,
            Data = null,
            Errors = errors ?? new List<ErrorDetail>()
        };
    }
}

public class ErrorDetail
{
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    public ErrorDetail()
    {
    }

    public ErrorDetail(string field, string message)
    {
        Field = field;
        Message = message;
    }
}

