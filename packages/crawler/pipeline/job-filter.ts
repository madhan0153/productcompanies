// Pre-LLM filters that protect Gemini quota and improve parse quality.
//
// Two concerns, both ported from the corejobs build spec (§4.2, §4.5):
//
// 1. `isNonEngineeringTitle(title)` — titles that are clearly HR / finance /
//    sales / admin / EHS at our product companies. Skip them entirely; never
//    spend a Gemini call deciding "no this isn't an SWE role". Amazon and
//    Microsoft careers pages return hundreds of these per crawl.
//
// 2. `stripBoilerplate(description)` — drop the legal / EEO / marketing
//    paragraphs that every JD opens or closes with. The 8k-char truncation
//    inside parseJobDescription's prompt should hold real signal, not the
//    "We are an equal opportunity employer..." block. Saves ~600–1000 chars
//    per Amazon/Google/Microsoft JD.

const NON_ENGINEERING_TITLE_PATTERNS: RegExp[] = [
  /\b(accountant|accounts|finance|financial|f&a|fp&?a|taxation|payroll|billing|invoice|audit)\b/i,
  /\b(hr|human\s*resource|talent\s*acquisition|recruiter|recruitment|people\s*partner|industrial\s*relation)\b/i,
  /\b(legal\s*counsel|compliance\s*officer|contract\s*manager|paralegal|lawyer|advocate)\b/i,
  /\b(account\s*executive|sales\s*(executive|representative|manager|rep)|business\s*development\s*(manager|representative)|sdr|bdr|crm\s*(executive|admin)|inside\s*sales)\b/i,
  /\b(marketing\s*(manager|executive|specialist)|brand\s*manager|pr\s*manager|content\s*writer|copywriter|seo\s*(specialist|executive))\b/i,
  /\b(store\s*(manager|executive|incharge|supervisor)|storekeeper|warehouse\s*(manager|associate)|logistics\s*(executive|coordinator)|supply\s*chain\s*(executive|analyst))\b/i,
  /\b(ehs|hse|health\s*&?\s*safety|environment.*safety|safety\s*officer)\b/i,
  /\b(facility|housekeeping|horticulture|travel\s*desk|canteen|reception(ist)?)\b/i,
  /\b(office\s*(assistant|manager|admin)|admin\s*assistant|peon|driver|chauffeur|secretary)\b/i,
  /\b(customer\s*support|support\s*executive|call\s*center|tele(caller|sales|marketing))\b/i,
];

export function isNonEngineeringTitle(title: string): boolean {
  if (!title) return false;
  return NON_ENGINEERING_TITLE_PATTERNS.some((re) => re.test(title));
}

// Boilerplate patterns: anchored, conservative. Each one targets a single
// paragraph or sentence that adds zero signal. Order doesn't matter; we just
// replace every match with a single space.
const BOILERPLATE_PATTERNS: RegExp[] = [
  // EEO statements (the largest single category)
  /(?:[A-Z][^.\n]{0,80}\s)?(?:is\s+)?an?\s+equal\s+opportunity\s+(?:and\s+affirmative\s+action\s+)?employer[^.\n]{0,400}\./gi,
  /we\s+(?:are\s+)?(?:proudly\s+)?committed\s+to\s+(?:building\s+a\s+)?diverse[^.\n]{0,300}\./gi,
  /(?:we\s+do\s+not\s+discriminate|without\s+regard\s+to|regardless\s+of)\s+(?:race|gender|religion|age|sexual|disability)[^.\n]{0,400}\./gi,
  /(?:applicants?|candidates?|employees?)\s+(?:will\s+be|are)\s+considered\s+(?:for\s+employment\s+)?without\s+regard\s+to[^.\n]{0,400}\./gi,
  /accommodation[s]?\s+(?:will\s+be\s+)?(?:made|provided|available)\s+(?:for|to)\s+(?:qualified\s+)?(?:individuals|applicants)[^.\n]{0,400}\./gi,

  // Reasonable-accommodation / disability standard clauses
  /if\s+you\s+(?:are\s+a\s+person\s+with\s+a\s+disability|need\s+(?:an?\s+)?accommodation)[^.\n]{0,400}\./gi,

  // Background-check / e-verify legalese
  /(?:this\s+(?:position|role|offer)\s+(?:is\s+)?(?:subject|contingent)\s+(?:to|upon)\s+(?:a\s+)?(?:background|reference)\s+check)[^.\n]{0,300}\./gi,
  /(?:e[-\s]?verify|right\s+to\s+work|work\s+authorization)[^.\n]{0,300}\./gi,

  // Generic marketing intros that show up across companies
  /(?:join\s+(?:us|our\s+team)|come\s+(?:join|work)\s+(?:us|with\s+us))[^.\n]{0,300}\./gi,
  /(?:our\s+mission\s+is\s+to|we\s+are\s+on\s+a\s+mission\s+to)[^.\n]{0,250}\./gi,
  /(?:at\s+[A-Z][\w&\s]{0,30},?\s+we\s+(?:believe|value|empower|enable|build))[^.\n]{0,300}\./gi,

  // "Equal Employment Opportunity" standalone heading + block
  /equal\s+employment\s+opportunity[^.\n]{0,500}\./gi,

  // Pay-range disclaimers (US-style — irrelevant for India roles)
  /(?:the\s+)?(?:base\s+)?(?:annual\s+)?(?:pay|salary|compensation)\s+range[^.\n]{0,400}\./gi,
];

export function stripBoilerplate(description: string): string {
  if (!description) return "";
  let out = description;
  for (const re of BOILERPLATE_PATTERNS) {
    out = out.replace(re, " ");
  }
  // Collapse the whitespace we just punched holes into.
  out = out.replace(/[ \t\f\v]+/g, " ")
           .replace(/\n[ ]+/g, "\n")
           .replace(/\n{3,}/g, "\n\n")
           .trim();
  return out;
}
