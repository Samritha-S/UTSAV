/**
 * Utsav Planner - API Client Module
 *
 * Coordinates network interactions with the FastAPI backend.
 * Features:
 * - Specific handling for HTTP 429 with Retry-After header.
 * - Standardized field-level validation error parsing.
 * - Friendly, human-readable error messages for network/server failures.
 * - Never reflects untrusted raw server text directly to UI.
 */

export class ApiError extends Error {
  /**
   * @param {string} code - Machine error code (e.g. 'RATE_LIMIT_EXCEEDED', 'VALIDATION_ERROR')
   * @param {string} userMessage - Clean human-readable message for UI display
   * @param {number} [retryAfter] - Retry delay in seconds for 429
   * @param {Object} [fieldErrors] - Field-specific error map for 422
   */
  constructor(code, userMessage, retryAfter = null, fieldErrors = {}) {
    super(userMessage);
    this.name = "ApiError";
    this.code = code;
    this.userMessage = userMessage;
    this.retryAfter = retryAfter;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Send event intake parameters to /api/plan to synthesize complete event plan.
 * @param {Object} eventInput
 * @returns {Promise<Object>} PlanResponse data
 */
export async function createPlan(eventInput) {
  return request("/api/plan", eventInput);
}

/**
 * Send natural language refinement instructions to /api/refine to adapt creative ideas.
 * @param {Object} eventInput
 * @param {string} refinementPrompt
 * @returns {Promise<Object>} Updated CreativeIdeas data
 */
export async function refinePlan(eventInput, refinementPrompt) {
  return request("/api/refine", {
    event_input: eventInput,
    refinement_prompt: refinementPrompt,
  });
}

/**
 * Unified internal HTTP request handler.
 * @param {string} endpoint
 * @param {Object} body
 * @returns {Promise<Object>}
 */
async function request(endpoint, body) {
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("Network request failed:", err);
    throw new ApiError(
      "NETWORK_ERROR",
      "Unable to connect to the planning server. Please check your internet connection and try again."
    );
  }

  // 1. Successful response
  if (response.ok) {
    try {
      return await response.json();
    } catch {
      throw new ApiError("PARSE_ERROR", "Received malformed data from server. Please retry.");
    }
  }

  // 2. Rate limiting (HTTP 429)
  if (response.status === 429) {
    const retryHeader = response.headers.get("Retry-After");
    const retrySeconds = retryHeader ? parseInt(retryHeader, 10) : 60;
    const waitTime = isNaN(retrySeconds) || retrySeconds <= 0 ? 60 : retrySeconds;
    throw new ApiError(
      "RATE_LIMIT_EXCEEDED",
      `Planning requests are busy. Please wait ${waitTime} seconds before trying again.`,
      waitTime
    );
  }

  // 3. Payload size limit (HTTP 413)
  if (response.status === 413) {
    throw new ApiError(
      "PAYLOAD_TOO_LARGE",
      "Your plan notes or inputs are too large. Please reduce the length and try again."
    );
  }

  // 4. Unsupported media type (HTTP 415)
  if (response.status === 415) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Invalid request format sent to server."
    );
  }

  // 5. Validation error (HTTP 422)
  if (response.status === 422) {
    let errorJson = null;
    try {
      errorJson = await response.json();
    } catch {}

    const fieldErrors = {};
    let message = "Please check your inputs and correct the highlighted fields.";

    if (errorJson && errorJson.error && errorJson.error.message) {
      message = errorJson.error.message;
    }

    throw new ApiError("VALIDATION_ERROR", message, null, fieldErrors);
  }

  // 6. Generic server error (HTTP 500)
  throw new ApiError(
    "SERVER_ERROR",
    "An unexpected error occurred while calculating your event plan. Please try again."
  );
}
