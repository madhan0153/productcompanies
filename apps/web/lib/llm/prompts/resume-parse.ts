import { geminiFlash, SchemaType, type Schema } from "@/lib/llm/gemini";

export interface ParsedResume {
  name: string;
  current_role: string;
  total_years_experience: number;
  tech_stack: string[];
  soft_skills: string[];
  products_built: string[];
  companies: Array<{
    name: string;
    role: string;
    years: number;
    is_product_company: boolean;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: number;
  }>;
  summary: string;
  product_dna_score: number;
  estimated_current_lpa?: number;
  preferred_hubs?: string[];
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING },
    current_role: { type: SchemaType.STRING },
    total_years_experience: { type: SchemaType.NUMBER },
    tech_stack: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    soft_skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    products_built: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    companies: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          role: { type: SchemaType.STRING },
          years: { type: SchemaType.NUMBER },
          is_product_company: { type: SchemaType.BOOLEAN },
        },
        required: ["name", "role", "years", "is_product_company"],
      },
    },
    education: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          degree: { type: SchemaType.STRING },
          institution: { type: SchemaType.STRING },
          year: { type: SchemaType.NUMBER },
        },
        required: ["degree", "institution"],
      },
    },
    summary: { type: SchemaType.STRING },
    product_dna_score: { type: SchemaType.NUMBER },
    estimated_current_lpa: { type: SchemaType.NUMBER },
    preferred_hubs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: [
    "name", "current_role", "total_years_experience",
    "tech_stack", "soft_skills", "products_built",
    "companies", "education", "summary", "product_dna_score",
  ],
};

const INDIA_HUBS = ["Bengaluru", "Hyderabad", "Pune", "Gurugram", "Noida", "Delhi NCR", "Mumbai", "Chennai", "Remote-India"];

const PROMPT = `You are an expert resume parser for an India-focused engineering job platform.
Extract structured information from the provided resume PDF.

For product_dna_score (0–100), score based on:
- % of career spent at product/tech companies (not IT services/outsourcing): up to 35 points
- Evidence of building user-facing products at scale (millions of users, SaaS, B2C): up to 25 points
- Tech stack modernity (cloud-native, microservices, modern frameworks vs legacy): up to 20 points
- Leadership/ownership signals (led features, teams, launched products): up to 20 points

For preferred_hubs, infer from work history cities. Use only: ${INDIA_HUBS.join(", ")}.
If current company is a product company (Google, Meta, Razorpay, Zerodha, CRED, Groww, etc.), set is_product_company=true.
Estimate total_years_experience from work history dates.
Do NOT include PII in summary — only professional summary.
For estimated_current_lpa: estimate in LPA (lakhs per annum) based on role seniority, company tier, and years of experience in India market. Return null/omit if insufficient data.`;

export async function parseResumePdf(pdfBase64: string): Promise<ParsedResume> {
  const model = geminiFlash();
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      temperature: 0.1,
    },
  });

  const text = result.response.text();
  return JSON.parse(text) as ParsedResume;
}
