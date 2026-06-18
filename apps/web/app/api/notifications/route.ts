import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const before = req.nextUrl.searchParams.get("before");
  const validBefore = before && !Number.isNaN(Date.parse(before)) ? before : null;
  let itemsQuery = supabase
    .from("notifications")
    .select("id, type, title, body, url, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(21);
  if (validBefore) itemsQuery = itemsQuery.lt("created_at", validBefore);

  const [{ data: rows, error }, { count }] = await Promise.all([
    itemsQuery,
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  if (error) return NextResponse.json({ error: "Could not load notifications" }, { status: 500 });
  const items = (rows ?? []).slice(0, 20);
  return NextResponse.json({
    items,
    unreadCount: count ?? 0,
    hasMore: (rows?.length ?? 0) > 20,
    nextCursor: items.at(-1)?.created_at ?? null,
  });
}
