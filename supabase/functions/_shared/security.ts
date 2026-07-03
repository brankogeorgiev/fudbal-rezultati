// Shared security helpers for edge functions.

// Map internal/database errors to safe, generic client messages so we never
// leak schema names, constraint names, or other implementation details.
export function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  const mappings: [RegExp, string][] = [
    [/duplicate key|already exists|unique constraint/i, "This record already exists"],
    [/foreign key/i, "Invalid reference to a related record"],
    [/row-level security|permission denied|not authorized/i, "You do not have permission to perform this action"],
    [/invalid input syntax|invalid input value/i, "Invalid data format provided"],
    [/check constraint|violates/i, "Data validation failed"],
    [/not-null|null value/i, "A required field is missing"],
  ];

  for (const [pattern, safeMessage] of mappings) {
    if (pattern.test(message)) return safeMessage;
  }

  return "An error occurred while processing your request";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

// Validates and normalizes a human-readable name.
// Returns the trimmed value, or an error string when invalid.
export function validateName(
  value: unknown,
  { min = 1, max = 100 }: { min?: number; max?: number } = {},
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "Name is required and must be text" };
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    return { ok: false, error: "Name is required" };
  }
  if (trimmed.length > max) {
    return { ok: false, error: `Name must be at most ${max} characters` };
  }
  return { ok: true, value: trimmed };
}

// Validates an ISO date (YYYY-MM-DD) or full ISO timestamp string.
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const ts = Date.parse(value);
  return !Number.isNaN(ts);
}

// Validates a non-negative integer score within a sane bound.
export function isValidScore(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 1000
  );
}
