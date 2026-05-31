import { NextResponse } from "next/server";
import { CHECKOUT_PRODUCTS, type CheckoutProductId } from "@/lib/billing/catalog";
import { serverEnv } from "@/lib/env";

// Lightweight server probe: which CheckoutProductIds can actually start a
// Dodo session right now? Clients call this on mount to dim CTAs they
// can't fulfil, so users never click a button that silently throws.
//
// Cached briefly (60s); env vars only change on redeploy.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENV_LOOKUP: Record<string, string | undefined> = {
  DODO_PRODUCT_PRO_MONTHLY_ID:           serverEnv.DODO_PRODUCT_PRO_MONTHLY_ID,
  DODO_PRODUCT_PRO_YEARLY_ID:            serverEnv.DODO_PRODUCT_PRO_YEARLY_ID,
  DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID: serverEnv.DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID,
  DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID:  serverEnv.DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID,
  DODO_PRODUCT_TAILOR_CREDITS_50_ID:     serverEnv.DODO_PRODUCT_TAILOR_CREDITS_50_ID,
};

export async function GET() {
  const apiKeyReady = Boolean(serverEnv.DODO_PAYMENTS_API_KEY);
  const products = {} as Record<CheckoutProductId, boolean>;
  for (const [id, meta] of Object.entries(CHECKOUT_PRODUCTS)) {
    products[id as CheckoutProductId] = apiKeyReady && Boolean(ENV_LOOKUP[meta.envKey]);
  }
  return NextResponse.json(
    { products, apiKeyReady },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
  );
}
