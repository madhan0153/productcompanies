import { Webhook } from "standardwebhooks";
import { clientEnv, serverEnv } from "@/lib/env";
import { CHECKOUT_PRODUCTS, type CheckoutProductId } from "./catalog";

export interface DodoCheckoutSession {
  session_id: string;
  checkout_url: string;
}

export interface DodoWebhookEvent {
  business_id?: string;
  type: string;
  timestamp?: string;
  data: Record<string, unknown>;
}

function dodoBaseUrl(): string {
  if (serverEnv.DODO_PAYMENTS_BASE_URL) return serverEnv.DODO_PAYMENTS_BASE_URL.replace(/\/$/, "");
  return serverEnv.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://api.dodopayments.com";
}

export function getDodoProductId(product: CheckoutProductId): string {
  const envKey = CHECKOUT_PRODUCTS[product].envKey;
  switch (envKey) {
    case "DODO_PRODUCT_PRO_MONTHLY_ID": return serverEnv.DODO_PRODUCT_PRO_MONTHLY_ID ?? "";
    case "DODO_PRODUCT_PRO_YEARLY_ID": return serverEnv.DODO_PRODUCT_PRO_YEARLY_ID ?? "";
    case "DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID": return serverEnv.DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID ?? "";
    case "DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID": return serverEnv.DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID ?? "";
    case "DODO_PRODUCT_TAILOR_CREDITS_50_ID": return serverEnv.DODO_PRODUCT_TAILOR_CREDITS_50_ID ?? "";
    default: return "";
  }
}

export async function createDodoCheckoutSession(input: {
  product: CheckoutProductId;
  userId: string;
  email: string;
  name?: string | null;
  /** Where to send the user after successful activation. Must be a same-origin path. */
  returnTo?: string;
}): Promise<DodoCheckoutSession> {
  const apiKey = serverEnv.DODO_PAYMENTS_API_KEY;
  if (!apiKey) throw new Error("DODO_PAYMENTS_API_KEY is not configured.");

  const productId = getDodoProductId(input.product);
  if (!productId) throw new Error(`${CHECKOUT_PRODUCTS[input.product].envKey} is not configured.`);

  const sessionNonce = crypto.randomUUID();
  const returnUrl = new URL("/billing/success", clientEnv.NEXT_PUBLIC_APP_URL);
  returnUrl.searchParams.set("product", input.product);
  returnUrl.searchParams.set("session", sessionNonce);
  if (input.returnTo && input.returnTo.startsWith("/")) {
    returnUrl.searchParams.set("return_to", input.returnTo);
  }

  const cancelUrl = new URL("/pricing", clientEnv.NEXT_PUBLIC_APP_URL);
  cancelUrl.searchParams.set("cancelled", "1");

  const response = await fetch(`${dodoBaseUrl()}/checkouts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: input.email,
        name: input.name ?? input.email.split("@")[0],
      },
      return_url: returnUrl.toString(),
      cancel_url: cancelUrl.toString(),
      metadata: {
        app: "prodmatch",
        user_id: input.userId,
        checkout_product: input.product,
        session_nonce: sessionNonce,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dodo checkout failed: ${response.status} ${text.slice(0, 160)}`);
  }

  const payload = await response.json() as Partial<DodoCheckoutSession>;
  if (!payload.session_id || !payload.checkout_url) {
    throw new Error("Dodo checkout did not return a session URL.");
  }
  return { session_id: payload.session_id, checkout_url: payload.checkout_url };
}

export function verifyDodoWebhook(rawBody: string, headers: Headers): DodoWebhookEvent {
  const webhookKey = serverEnv.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey) throw new Error("DODO_PAYMENTS_WEBHOOK_KEY is not configured.");

  const webhook = new Webhook(webhookKey);
  const event = webhook.verify(rawBody, {
    "webhook-id": headers.get("webhook-id") ?? "",
    "webhook-signature": headers.get("webhook-signature") ?? "",
    "webhook-timestamp": headers.get("webhook-timestamp") ?? "",
  }) as DodoWebhookEvent;

  if (!event || typeof event.type !== "string" || typeof event.data !== "object" || !event.data) {
    throw new Error("Invalid Dodo webhook payload.");
  }
  return event;
}
