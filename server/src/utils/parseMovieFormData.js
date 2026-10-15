export const parseMovieFormData = (body) => {
  const parsed = { ...body };

  // Convert numeric fields
  if (
    typeof parsed.durationMinutes === "string" &&
    parsed.durationMinutes.trim() !== ""
  ) {
    parsed.durationMinutes = Number(parsed.durationMinutes);
  }

  // Convert JSON array fields
  for (const field of ["genres", "languages", "cast"]) {
    if (typeof parsed[field] === "string") {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch {
        // Leave invalid input unchanged.
        // Zod will return a validation error.
      }
    }
  }

  return parsed;
};
