using Microsoft.AspNetCore.Mvc;
using SmartPropertyAI.Application.Common;

namespace SmartPropertyAI.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    protected ActionResult<ApiResponse<T>> OkResponse<T>(T data, string message = "Success")
    {
        return Ok(ApiResponse<T>.SuccessResult(data, message));
    }

    protected ActionResult<ApiResponse<T>> CreatedResponse<T>(string actionName, object? routeValues, T data, string message = "Created successfully")
    {
        return CreatedAtAction(actionName, routeValues, ApiResponse<T>.SuccessResult(data, message));
    }

    protected ActionResult<ApiResponse> OkMessage(string message = "Success")
    {
        return Ok(ApiResponse.SuccessResult(message));
    }
}

