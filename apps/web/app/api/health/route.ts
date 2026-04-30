import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("companies")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, supabase: "error", error: error.message },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      supabase: "connected",
      companies: count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, supabase: "unreachable", error: (err as Error).message },
      { status: 503 },
    );
  }
}
