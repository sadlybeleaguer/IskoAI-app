export function getErrorMessage(
  error,
  fallbackMessage = "Unable to complete the request.",
) {
  if (error instanceof Error) {
    return error.message
  }

  return fallbackMessage
}
