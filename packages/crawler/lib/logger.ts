type Level = "info" | "warn" | "error";

export function log(msg: string, level: Level = "info"): void {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  if (level === "error") console.error(`${prefix} ${msg}`);
  else if (level === "warn") console.warn(`${prefix} ${msg}`);
  else console.log(`${prefix} ${msg}`);
}

export function makeLogger(company: string) {
  return (msg: string, level: Level = "info") => log(`[${company}] ${msg}`, level);
}
