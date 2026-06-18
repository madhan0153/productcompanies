import { z } from "zod";

const SAFE_PATH = /^\/(?!\/)[a-zA-Z0-9/_?=&%#.+~-]*$/;

export const PushPayloadSchema = z.object({
  type: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().max(180).optional(),
  url: z.string().trim().max(512).refine((value) => SAFE_PATH.test(value), "Unsafe deep link").optional(),
  data: z
    .object({
      count: z.number().int().nonnegative().max(10_000).optional(),
      jobId: z.string().uuid().optional(),
      applicationId: z.string().uuid().optional(),
      source: z.string().trim().max(40).optional(),
    })
    .strict()
    .optional(),
  priority: z.enum(["critical", "time_sensitive", "important", "engagement"]).default("important"),
  deliveryWindow: z.enum(["respect", "due"]).default("respect"),
  idempotencyKey: z.string().trim().min(1).max(180).optional(),
  ttlSeconds: z.number().int().min(60).max(60 * 60 * 24 * 7).default(60 * 60 * 24),
});

export type PushPayload = z.input<typeof PushPayloadSchema>;

export function safeNotificationPath(value: string | null | undefined): string {
  return value && SAFE_PATH.test(value) ? value : "/dashboard";
}
