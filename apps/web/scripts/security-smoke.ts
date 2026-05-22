import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { getCronAuthFailure, verifySensitiveCronAuth } from "../lib/security/cron";
import { validateResumePdf } from "../lib/security/pdf";
import { checkRateLimit } from "../lib/security/rate-limit";

function fakePdf(extra = ""): ArrayBuffer {
  const padding = "Senior backend engineer Java Postgres distributed systems product ownership ".repeat(70);
  const body = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
4 0 obj
<< /Length 180 >>
stream
BT /F1 12 Tf 72 720 Td (Senior backend engineer with Java, Postgres, distributed systems, Kafka, AWS, observability, product ownership, API design, and India product company experience.) Tj ET
BT /F1 12 Tf 72 700 Td (${padding}) Tj ET
endstream
endobj
${extra}
  trailer
<< /Root 1 0 R >>
%%EOF`;
  return asArrayBuffer(Buffer.from(body, "latin1"));
}

function asArrayBuffer(buf: Buffer): ArrayBuffer {
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  return copy.buffer;
}

assert.deepEqual(getCronAuthFailure(null, undefined), {
  status: 503,
  body: { error: "Cron secret is not configured." },
});
assert.deepEqual(getCronAuthFailure("Bearer wrong", "secret"), {
  status: 401,
  body: { error: "Unauthorized" },
});
assert.equal(getCronAuthFailure("Bearer secret", "secret"), null);

assert.equal(validateResumePdf(fakePdf(), "application/pdf").ok, true);
assert.equal(validateResumePdf(fakePdf("/OpenAction << /S /JavaScript >>"), "application/pdf").ok, false);
assert.equal(validateResumePdf(fakePdf("/Encrypt 5 0 R"), "application/pdf").ok, false);
assert.equal(validateResumePdf(asArrayBuffer(Buffer.from("not a pdf")), "application/pdf").ok, false);

const rateKey = `security-smoke:${Date.now()}`;
assert.equal(checkRateLimit({ key: rateKey, limit: 2, windowMs: 60_000 }).ok, true);
assert.equal(checkRateLimit({ key: rateKey, limit: 2, windowMs: 60_000 }).ok, true);
assert.equal(checkRateLimit({ key: rateKey, limit: 2, windowMs: 60_000 }).ok, false);

// Security fix (S-8): HMAC verification for sensitive cron sub-modes.
// Inject the secret via process.env for the duration of these asserts.
{
  const priorSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "smoke-secret";
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ user_id: "abc-123" });
    const sig = createHmac("sha256", "smoke-secret").update(`${ts}.${body}`, "utf8").digest("hex");

    // Happy path
    assert.equal(
      verifySensitiveCronAuth({
        authHeader: "Bearer smoke-secret",
        tsHeader: ts,
        sigHeader: sig,
        rawBody: body,
      }).ok,
      true,
    );

    // Tampered body -> mismatched HMAC
    const tamper = verifySensitiveCronAuth({
      authHeader: "Bearer smoke-secret",
      tsHeader: ts,
      sigHeader: sig,
      rawBody: body + "x",
    });
    assert.equal(tamper.ok, false);
    if (!tamper.ok) assert.equal(tamper.status, 401);

    // Stale timestamp (1 hour old) -> rejected with 403
    const oldTs = String(Math.floor(Date.now() / 1000) - 3600);
    const oldSig = createHmac("sha256", "smoke-secret").update(`${oldTs}.${body}`, "utf8").digest("hex");
    const stale = verifySensitiveCronAuth({
      authHeader: "Bearer smoke-secret",
      tsHeader: oldTs,
      sigHeader: oldSig,
      rawBody: body,
    });
    assert.equal(stale.ok, false);
    if (!stale.ok) assert.equal(stale.status, 403);

    // Wrong bearer falls through to the same auth gate
    const wrongBearer = verifySensitiveCronAuth({
      authHeader: "Bearer other",
      tsHeader: ts,
      sigHeader: sig,
      rawBody: body,
    });
    assert.equal(wrongBearer.ok, false);
    if (!wrongBearer.ok) assert.equal(wrongBearer.status, 401);
  } finally {
    if (priorSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = priorSecret;
  }
}

console.log("security-smoke passed");
