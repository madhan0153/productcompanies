import { createHash } from "node:crypto";

export function computeSignature(title: string, location: string, description: string): string {
  const input = `${title.trim().toLowerCase()}|${location.trim().toLowerCase()}|${description.slice(0, 1000)}`;
  return createHash("sha256").update(input).digest("hex");
}
