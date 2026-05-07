// One-off smoke test: parse a single JD via the full cascade.
// Shows us exactly where the hang is.
import { parseJobDescription } from "../lib/llm/prompts/jd-parse";

async function main() {
  console.time("jd-parse");
  const t = Date.now();
  const tick = setInterval(() => console.log(`  …still running, +${Math.round((Date.now() - t) / 1000)}s`), 5000);
  try {
    const out = await parseJobDescription({
      title: "Senior Data Engineer",
      description: `We are hiring a Senior Data Engineer with 5+ years of experience in PySpark, Databricks, and cloud data platforms. Must have strong SQL skills. Experience with Kafka or Airflow is a plus. The role is hybrid in Bengaluru.`,
      seniority_hint: "senior",
    });
    clearInterval(tick);
    console.timeEnd("jd-parse");
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    clearInterval(tick);
    console.timeEnd("jd-parse");
    console.error("ERR:", e);
  }
}

main();
