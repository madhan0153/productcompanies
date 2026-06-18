import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Body = z.object({ id: z.string().uuid().optional() }).nullable();

// Mark notifications read. With an `id`, marks that one; without, marks every
// unread row for the user. RLS confines the update to the caller's own rows.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const id = parsed.success ? parsed.data?.id : undefined;

  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (id) query = query.eq("id", id);

  await query;
  return NextResponse.json({ ok: true });
}
