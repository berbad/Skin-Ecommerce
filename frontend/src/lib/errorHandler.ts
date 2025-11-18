export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
};

export const handleApiError = (
  error: unknown,
  fallback: string = "Something went wrong"
): string => {
  console.error("API Error:", error);
  return fallback;
};
