const ERROR_CODE_KEYS = {
  VALIDATION_ERROR: "errors.invalidInput",
  VALIDATION_API_KEYS: "errors.addApiKey",
  VALIDATION_IMAGE_REQUIRED: "errors.uploadImage",
  VALIDATION_IMAGE_FORMAT: "errors.usePngJpg",
  VALIDATION_IMAGE_MIME: "errors.unsupportedFormat",
  VALIDATION_IMAGE_SIZE: "errors.imageTooLarge",
  PROVIDER_AUTH: "errors.invalidKey",
  PROVIDER_RATE_LIMIT: "errors.rateLimit",
  PROVIDER_BAD_REQUEST: "errors.providerRejected",
  PROVIDER_TIMEOUT: "errors.timeout",
  PROVIDER_UPSTREAM: "errors.serviceBusy",
  PROVIDER_FAILURE: "errors.noValidResponse",
  ALL_KEYS_EXHAUSTED: "errors.allKeysExhausted",
  ALL_KEYS_RATE_LIMITED: "errors.allKeysRateLimit",
  MODEL_INVALID_JSON: "errors.invalidModelData",
  MODEL_INCOMPLETE_OUTPUT: "errors.incompleteOutput",
  METADATA_ANALYSIS_FAILED: "errors.metadataFailed",
  INTERNAL_ERROR: "errors.tempError",
};

const ERROR_MESSAGES_EN = {
  VALIDATION_ERROR: "Invalid input. Please check and try again.",
  VALIDATION_API_KEYS: "Add an API key first, then try again.",
  VALIDATION_IMAGE_REQUIRED: "Please upload an image.",
  VALIDATION_IMAGE_FORMAT: "Use a PNG, JPG, or WEBP file.",
  VALIDATION_IMAGE_MIME: "This file format is not supported.",
  VALIDATION_IMAGE_SIZE: "Image too large. Use a file under 6MB.",
  PROVIDER_AUTH: "API key is not working. Try a different key.",
  PROVIDER_RATE_LIMIT: "Rate limit reached. Please try again later.",
  PROVIDER_BAD_REQUEST: "Provider rejected the request. Check your settings.",
  PROVIDER_TIMEOUT: "Response is taking too long. Try again.",
  PROVIDER_UPSTREAM: "Service is busy. Please try again later.",
  PROVIDER_FAILURE: "Could not get a valid response from the service.",
  ALL_KEYS_EXHAUSTED: "All keys have been exhausted. Add new keys.",
  ALL_KEYS_RATE_LIMITED: "All keys hit rate limits. Try again later.",
  MODEL_INVALID_JSON: "Model returned invalid data. Try again.",
  MODEL_INCOMPLETE_OUTPUT: "Output was incomplete. Try again.",
  METADATA_ANALYSIS_FAILED: "Could not generate metadata. Try again.",
  INTERNAL_ERROR: "A temporary error occurred. Try again.",
};

export function mapApiError(payload, t) {
  const code = payload?.code;
  if (code) {
    if (t && ERROR_CODE_KEYS[code]) return t(ERROR_CODE_KEYS[code]);
    if (ERROR_MESSAGES_EN[code]) return ERROR_MESSAGES_EN[code];
  }
  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
  const fallback = t ? t("errors.requestFailed") : "Request failed. Please try again.";
  return fallback;
}
