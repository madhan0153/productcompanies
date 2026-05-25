import test from "node:test";
import assert from "node:assert/strict";
import { extractText, getDocumentProxy } from "unpdf";
import { buildEvidenceBackedTailoredContent } from "../../lib/resume-intel/tailored-content";
import { buildDeterministicTailoredDiagnosis } from "../../lib/resume-intel/tailored-fallback";
import { renderTailoredResumeDocx } from "../../lib/docx/tailored-resume";
import { renderTailoredResumePdf } from "../../lib/pdf/tailored-resume";
import type { BulletRewrite } from "../../lib/llm/prompts/bullet-rewrite";
import type { ExtractedResumeContent } from "../../lib/llm/prompts/extract-resume-content";
import type { ResumeDiagnosis } from "../../lib/llm/prompts/resume-diagnose";
import type { ParsedResume } from "../../lib/llm/prompts/resume-parse";
import type { TailoredResumeContent } from "../../lib/llm/prompts/tailor-resume";

test("builds a PDF-ready tailored resume from source bullets plus approved JD edits only", async () => {
  const parsed = {
    name: "Test Candidate",
    current_role: "Backend Engineer",
    role_function: "backend",
    target_role_functions: ["backend"],
    total_years_experience: 4,
    tech_stack: ["React", "Node.js", "PostgreSQL", "Redis"],
    soft_skills: ["Ownership"],
    products_built: ["Checkout Platform: order placement and payments"],
    companies: [{ name: "ProductCart", role: "Backend Engineer", years: 3, is_product_company: true }],
    education: [{ degree: "B.Tech Computer Science", institution: "Sample Institute", year: 2020 }],
    summary: "Backend engineer building checkout and order systems.",
    product_dna_score: 82,
  } satisfies ParsedResume;

  const extracted = {
    summary: parsed.summary,
    skills: ["React", "Node.js", "PostgreSQL", "Redis"],
    experience: [{
      company: "ProductCart",
      role: "Backend Engineer",
      duration: "2021 - Present",
      bullets: [
        "Built checkout APIs in Node.js and PostgreSQL for order placement.",
        "Reduced checkout latency from 900ms to 420ms using Redis caching.",
        "Owned idempotent payment retry flows for failed transactions and partner gateway timeouts.",
        "Improved observability with structured logs, dashboards and on-call runbooks for checkout incidents.",
        "Partnered with frontend engineers to simplify cart-to-payment handoff and reduce user drop-offs.",
      ],
    }],
    projects: [{
      name: "Checkout Platform",
      bullets: [
        "Implemented order placement and payment retries using Node.js services.",
        "Documented API contracts for cart, inventory and payment service integrations.",
      ],
    }],
    education: [{ institution: "Sample Institute", degree: "B.Tech Computer Science", year: 2020 }],
  } satisfies ExtractedResumeContent;

  const diagnosis = {
    overall_grade: "B",
    headline: "Good backend resume with one JD keyword-density opportunity.",
    ats_risks: [],
    weak_bullets: [{
      section: "experience",
      company: "ProductCart",
      bullet_index: 0,
      original: extracted.experience[0].bullets[0],
      weakness: "keyword_gap",
      severity: 2,
    }],
    missing_keywords: [{ keyword: "Node.js", presence: "weak", rationale: "Mentioned once but not framed as backend ownership." }],
    recruiter_concerns: [],
  } satisfies ResumeDiagnosis;

  const rewrites: Record<string, BulletRewrite> = {
    "0": {
      index: 0,
      original: extracted.experience[0].bullets[0],
      alternatives: [{
        text: "Built Node.js checkout APIs backed by PostgreSQL for reliable order placement.",
        why: "Surfaces the JD backend stack already present in the source bullet.",
        risk_flag: null,
      }],
    },
  };

  const content = buildEvidenceBackedTailoredContent({
    resume: parsed,
    extracted,
    diagnosis,
    rewrites,
    decisions: { "0": { choice: "alt-0" } },
    displayName: parsed.name,
    preferredHubs: ["Bengaluru"],
    jdTitle: "Software Engineer, Backend",
    jdMustHaves: ["Node.js", "PostgreSQL", "Kafka"],
    jdNiceToHaves: ["Redis"],
  });

  assert.equal(content.experience[0].bullets[0], "Built Node.js checkout APIs backed by PostgreSQL for reliable order placement.");
  assert.equal(content.experience[0].bullets[1], extracted.experience[0].bullets[1]);
  assert.ok(content.skills[0].items.slice(0, 3).includes("Node.js"));
  assert.ok(content.skills[0].items.slice(0, 3).includes("PostgreSQL"));
  assert.ok(!content.skills[0].items.includes("Kafka"));

  const pdf = await renderTailoredResumePdf(content);
  assert.ok(pdf.byteLength > 1000);

  const proxy = await getDocumentProxy(new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength));
  const raw = await extractText(proxy, { mergePages: true });
  const pdfText = Array.isArray(raw.text) ? raw.text.join("\n") : (raw.text ?? "");
  assert.match(pdfText, /Built Node\.js checkout APIs backed by PostgreSQL/);
  assert.match(pdfText, /Reduced checkout latency from 900ms to 420ms/);
  assert.doesNotMatch(pdfText, /Kafka/);
});

test("renders a direct tailored resume even when parsed identity fields are sparse", async () => {
  const parsed = {
    name: "",
    current_role: "",
    role_function: "backend",
    target_role_functions: ["backend"],
    total_years_experience: 0,
    tech_stack: [],
    soft_skills: [],
    products_built: [],
    companies: [],
    education: [],
    summary: "",
    product_dna_score: 0,
  } satisfies ParsedResume;

  const diagnosis = {
    overall_grade: "C",
    headline: "Sparse resume with limited evidence.",
    ats_risks: [],
    weak_bullets: [],
    missing_keywords: [],
    recruiter_concerns: [],
  } satisfies ResumeDiagnosis;

  const content = buildEvidenceBackedTailoredContent({
    resume: parsed,
    extracted: null,
    diagnosis,
    rewrites: {},
    decisions: {},
    displayName: "",
    preferredHubs: [],
    jdTitle: "Software Engineer, Backend",
    jdMustHaves: ["PostgreSQL"],
    jdNiceToHaves: ["Redis"],
  });

  assert.equal(content.header.name, "Candidate");
  assert.equal(content.header.title, "Software Engineer, Backend");
  assert.equal(content.header.location, "India");

  const [docx, pdf] = await Promise.all([
    renderTailoredResumeDocx(content),
    renderTailoredResumePdf(content),
  ]);

  assert.ok(docx.byteLength > 1000);
  assert.ok(pdf.byteLength > 1000);
});

test("builds a renderable deterministic tailored resume when LLM diagnosis is unavailable", async () => {
  const parsed = {
    name: "Fallback Candidate",
    current_role: "Backend Engineer",
    role_function: "backend",
    target_role_functions: ["backend"],
    total_years_experience: 3,
    tech_stack: ["Node.js", "PostgreSQL", "Redis"],
    soft_skills: [],
    products_built: ["Payments API: built idempotent retry handling"],
    companies: [{ name: "FintechCo", role: "Backend Engineer", years: 3, is_product_company: true }],
    education: [{ degree: "B.Tech", institution: "Example University", year: 2021 }],
    summary: "Backend engineer building payments and order APIs.",
    product_dna_score: 75,
  } satisfies ParsedResume;

  const diagnosis = buildDeterministicTailoredDiagnosis({
    resume: parsed,
    extracted: null,
    jdTitle: "Software Engineer, Backend",
    jdMustHaves: ["Node.js", "PostgreSQL", "Kafka"],
    jdNiceToHaves: ["Redis"],
  });

  assert.equal(diagnosis.weak_bullets.length, 0);
  assert.ok(diagnosis.missing_keywords.some((item) => item.keyword === "Kafka"));

  const content = buildEvidenceBackedTailoredContent({
    resume: parsed,
    extracted: null,
    diagnosis,
    rewrites: {},
    decisions: {},
    displayName: parsed.name,
    preferredHubs: ["Hyderabad"],
    jdTitle: "Software Engineer, Backend",
    jdMustHaves: ["Node.js", "PostgreSQL", "Kafka"],
    jdNiceToHaves: ["Redis"],
  });

  assert.equal(content.header.name, "Fallback Candidate");
  assert.ok(content.skills[0].items.includes("Node.js"));
  assert.ok(content.skills[0].items.includes("PostgreSQL"));
  assert.ok(!content.skills[0].items.includes("Kafka"));

  const [docx, pdf] = await Promise.all([
    renderTailoredResumeDocx(content),
    renderTailoredResumePdf(content),
  ]);

  assert.ok(docx.byteLength > 1000);
  assert.ok(pdf.byteLength > 1000);
});

test("renders PDF from legacy cached tailored content with scalar list fields", async () => {
  const content = {
    header: {
      name: "Legacy Candidate",
      title: "Backend Engineer",
      location: "Bengaluru",
      contact_line: "",
    },
    summary: "Backend engineer building reliable APIs.",
    skills: [{ group: "Backend", items: "Node.js, PostgreSQL, Redis" }],
    experience: [{
      company: "ProductCart",
      role: "Backend Engineer",
      duration: "2021 - Present",
      bullets: "Built order APIs in Node.js.\nReduced latency with Redis caching.",
    }],
    education: [{ institution: "Sample Institute", degree: "B.Tech", year: "2020" }],
    projects: [{ name: "Checkout Platform", tech: "Node.js, PostgreSQL", summary: "Built checkout APIs." }],
    tailoring_notes: "",
  } as unknown as TailoredResumeContent;

  const pdf = await renderTailoredResumePdf(content);
  assert.ok(pdf.byteLength > 1000);
});
