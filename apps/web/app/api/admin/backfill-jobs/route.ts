// POST /api/admin/backfill-jobs
// One-time backfill: classifies role_function for all active jobs that don't have one yet.
// Protected by CRON_SECRET header so it can't be triggered publicly.
// Run once from curl after deploying the Phase F schema migration.
//
// curl -X POST https://prodmatchai.vercel.app/api/admin/backfill-jobs \
//   -H "Authorization: Bearer $CRON_SECRET"

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const ROLE_FUNCTION_VALUES = [
  "qa_sdet", "backend", "frontend", "fullstack",
  "data_engineering", "ml_ai", "devops_platform", "mobile",
  "engineering_management", "product_management", "design", "security", "other",
] as const;

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    role_function: { type: SchemaType.STRING },
  },
  required: ["role_function"],
};

async function classifyJob(title: string, description: string): Promise<string> {
  const prompt = `Classify this job's engineering function.

Job title: ${title}
Job description excerpt: ${description.slice(0, 400)}

Choose EXACTLY one of these values:
${ROLE_FUNCTION_VALUES.join(", ")}

Definitions:
- qa_sdet: QA engineers, SDETs, test automation, quality leads, QA managers
- backend: backend/API/server-side software engineers
- frontend: UI engineers, React/Vue/Angular specialists
- fullstack: engineers owning both frontend and backend
- data_engineering: data pipelines, ETL, Spark, Airflow, Kafka, data platform
- ml_ai: ML engineers, data scientists, AI researchers
- devops_platform: DevOps, SRE, infrastructure, platform engineers
- mobile: iOS/Android/React Native/Flutter engineers
- engineering_management: EM, VP Eng, Head of Engineering, Director of Engineering
- product_management: product managers, program managers, TPMs
- design: UX/UI designers, product designers
- security: security engineers, AppSec, penetration testers
- other: anything not listed above

Return only the role_function field.`;

  const text = await runWithRetry("light", async (model) => {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0,
      },
    });
    return result.response.text();
  });

  const raw = JSON.parse(text) as { role_function: string };
  const fn = raw.role_function?.toLowerCase().trim();
  return (ROLE_FUNCTION_VALUES as readonly string[]).includes(fn) ? fn : "other";
}

export async function POST(req: NextRequest) {
  // Auth check
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  // Fetch jobs that haven't been classified yet (limit 100 per run)
  const { data: jobs, error } = await admin
    .from("jobs")
    .select("id, title, description")
    .is("role_function", null)
    .eq("is_active", true)
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!jobs?.length) {
    return NextResponse.json({ message: "All jobs already classified", updated: 0 });
  }

  let updated = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const role_function = await classifyJob(
        job.title as string,
        (job.description as string | null) ?? "",
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("jobs") as any)
        .update({ role_function })
        .eq("id", job.id as string);
      updated++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    message: `Classified ${updated} jobs${failed ? `, ${failed} failed` : ""}`,
    updated,
    failed,
    remaining: (jobs.length === 100)
      ? "More jobs remain — run again to continue"
      : "All done",
  });
}
