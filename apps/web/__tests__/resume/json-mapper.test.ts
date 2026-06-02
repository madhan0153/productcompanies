// Round-trip + edge-case tests for the ParsedResume <-> JsonResume mapper.
// Runs under: tsx --test apps/web/__tests__/resume/json-mapper.test.ts
//
// Privacy: tests use synthetic data only — no real names, emails, or
// employer info. If you're adding a regression case, mirror this pattern.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsedResumeToJson,
  jsonToParsedResume,
  emptyJsonResume,
} from "../../lib/resume/json-mapper";
import { JsonResumeSchema } from "@prodmatch/shared";
import type { ParsedResume } from "../../lib/llm/prompts/resume-parse";

function fixture(): ParsedResume {
  return {
    name: "A. Engineer",
    current_role: "Senior Backend Engineer",
    role_function: "backend",
    target_role_functions: ["backend", "fullstack"],
    total_years_experience: 6.5,
    tech_stack: ["TypeScript", "Go", "Postgres", "Kafka"],
    soft_skills: ["mentorship", "incident response"],
    products_built: ["Order Service", "Payment Reconciler"],
    companies: [
      { name: "Alpha", role: "Senior Backend Engineer", years: 3, is_product_company: true },
      { name: "Bravo", role: "Backend Engineer",       years: 2.5, is_product_company: false },
    ],
    education: [
      { degree: "B.E. CSE", institution: "Synthetic University", year: 2018 },
    ],
    summary: "Backend engineer with reliability focus.",
    product_dna_score: 72,
    estimated_current_lpa: 38,
    preferred_hubs: ["Bengaluru", "Remote-India"],
  };
}

test("parsedResumeToJson produces a schema-valid document", () => {
  const json = parsedResumeToJson(fixture());
  const ok = JsonResumeSchema.safeParse(json);
  assert.equal(ok.success, true);
});

test("emptyJsonResume validates against the schema", () => {
  const ok = JsonResumeSchema.safeParse(emptyJsonResume());
  assert.equal(ok.success, true);
});

test("round-trip preserves the core ParsedResume fields", () => {
  const before = fixture();
  const json = parsedResumeToJson(before);
  const after = jsonToParsedResume(json);

  assert.equal(after.name, before.name);
  assert.equal(after.current_role, before.current_role);
  assert.equal(after.role_function, before.role_function);
  assert.deepEqual(after.target_role_functions, before.target_role_functions);
  assert.equal(after.total_years_experience, before.total_years_experience);
  assert.equal(after.product_dna_score, before.product_dna_score);
  assert.equal(after.estimated_current_lpa, before.estimated_current_lpa);
  assert.deepEqual(after.preferred_hubs, before.preferred_hubs);
  assert.deepEqual(after.products_built, before.products_built);
});

test("round-trip preserves is_product_company on each company", () => {
  const before = fixture();
  const json = parsedResumeToJson(before);
  const after = jsonToParsedResume(json);
  assert.equal(after.companies.length, before.companies.length);
  for (let i = 0; i < before.companies.length; i++) {
    assert.equal(after.companies[i].name, before.companies[i].name);
    assert.equal(after.companies[i].role, before.companies[i].role);
    assert.equal(after.companies[i].years, before.companies[i].years);
    assert.equal(after.companies[i].is_product_company, before.companies[i].is_product_company);
  }
});

test("round-trip merges tech_stack + soft_skills into the right buckets", () => {
  const before = fixture();
  const json = parsedResumeToJson(before);
  const after = jsonToParsedResume(json);
  for (const t of before.tech_stack) {
    assert.ok(after.tech_stack.some((s) => s.toLowerCase() === t.toLowerCase()), `missing tech: ${t}`);
  }
  for (const s of before.soft_skills) {
    assert.ok(after.soft_skills.some((x) => x.toLowerCase() === s.toLowerCase()), `missing soft: ${s}`);
  }
});

test("review edit payload maps submitted changes back to ParsedResume", () => {
  const json = parsedResumeToJson(fixture());
  json.basics.name = "Reviewed Candidate";
  json.basics.label = "Staff Backend Engineer";
  json.basics.summary = "Reviewed summary focused on platform ownership.";
  json.work[0] = {
    ...json.work[0],
    name: "Reviewed Product Co",
    position: "Staff Backend Engineer",
    highlights: ["Led a platform migration used by 40 product teams."],
    "x-prodmatch-product": true,
    "x-prodmatch-years": 4,
  };
  json.skills = [
    { name: "Technical", keywords: ["TypeScript", "Kubernetes", "Postgres"] },
    { name: "Soft Skills", keywords: ["mentorship"] },
  ];
  json.projects = [
    { name: "Reviewed Platform", description: "Internal platform", highlights: [], keywords: ["Kubernetes"], roles: [] },
  ];

  const submitted = JsonResumeSchema.parse(json);
  const parsed = jsonToParsedResume(submitted);

  assert.equal(parsed.name, "Reviewed Candidate");
  assert.equal(parsed.current_role, "Staff Backend Engineer");
  assert.equal(parsed.summary, "Reviewed summary focused on platform ownership.");
  assert.equal(parsed.companies[0].name, "Reviewed Product Co");
  assert.equal(parsed.companies[0].role, "Staff Backend Engineer");
  assert.equal(parsed.companies[0].years, 4);
  assert.equal(parsed.companies[0].is_product_company, true);
  assert.deepEqual(parsed.tech_stack, ["TypeScript", "Kubernetes", "Postgres"]);
  assert.deepEqual(parsed.soft_skills, ["mentorship"]);
  assert.deepEqual(parsed.products_built, ["Reviewed Platform"]);
});

test("imports a third-party JSON Resume with no x-prodmatch extensions", () => {
  // Realistic JSON Resume from another tool — no ProdMatch metadata at all.
  const incoming = JsonResumeSchema.parse({
    basics: {
      name: "B. Builder",
      label: "Frontend Engineer",
      summary: "Designs UIs.",
      location: { city: "Hyderabad", countryCode: "IN" },
      profiles: [],
    },
    work: [{
      name: "Imported Corp",
      position: "Frontend Engineer",
      startDate: "2021-06",
      endDate: "Present",
      summary: "UI dev",
      highlights: ["Improved LCP from 4.2s to 1.8s."],
    }],
    education: [{ institution: "Synthetic University", studyType: "B.Tech", area: "ECE", endDate: "2021" }],
    skills: [
      { name: "Technical", keywords: ["React", "TypeScript"] },
      { name: "Soft Skills", keywords: ["communication"] },
    ],
    projects: [], awards: [], certificates: [], languages: [], interests: [],
  });

  const parsed = jsonToParsedResume(incoming);
  assert.equal(parsed.name, "B. Builder");
  assert.equal(parsed.current_role, "Frontend Engineer");
  // No x-prodmatch hint → role_function defaults to "other".
  assert.equal(parsed.role_function, "other");
  // No x-prodmatch-product hint → is_product_company defaults to false.
  assert.equal(parsed.companies[0].is_product_company, false);
  // total_years derived from work dates (2021-06 → Present, ~current year - 2021).
  assert.ok(parsed.total_years_experience >= 3, "years should reflect work duration");
  assert.equal(parsed.product_dna_score, 0, "score should be 0 to trigger recompute");
  assert.deepEqual(parsed.tech_stack, ["React", "TypeScript"]);
  assert.deepEqual(parsed.soft_skills, ["communication"]);
});

test("rejects malformed JSON Resume (wrong types) via schema parse", () => {
  const bad = {
    basics: { name: 123, profiles: [] },
    work: "not an array",
  };
  const result = JsonResumeSchema.safeParse(bad);
  assert.equal(result.success, false);
});

test("schema accepts unknown vendor extension keys via passthrough", () => {
  const ok = JsonResumeSchema.safeParse({
    basics: {
      name: "C. Tester",
      profiles: [],
      "x-some-vendor-field": "preserved",
    },
    work: [], education: [], skills: [], projects: [],
    awards: [], certificates: [], languages: [], interests: [],
  });
  assert.equal(ok.success, true);
});
