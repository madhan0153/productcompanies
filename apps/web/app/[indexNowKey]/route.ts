// IndexNow key verification file.
//
// IndexNow requires the operator to host a file at /{key}.txt that contains
// the key as its body, so search engines can verify ownership. This catch-all
// route returns the configured INDEXNOW_KEY when the requested filename
// matches it; everything else returns 404 so we don't accidentally serve a
// general-purpose static-file route.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ indexNowKey: string }> }) {
  const { indexNowKey } = await params;
  const configured = process.env.INDEXNOW_KEY ?? "";
  if (!configured) return new NextResponse("Not Found", { status: 404 });

  // Accept either "{KEY}.txt" or bare "{KEY}".
  const expected = [configured, `${configured}.txt`];
  if (!expected.includes(indexNowKey)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(configured, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
