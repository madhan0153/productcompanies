type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, string | number | boolean | null | undefined>;

function scrub(fields: LogFields): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean | null>;
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}): void {
  const payload = {
    event,
    ...scrub(fields),
    at: new Date().toISOString(),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
