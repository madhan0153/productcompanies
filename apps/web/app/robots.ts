// /robots.txt — Next.js File-based metadata.
//
// Strategy:
//   1. The legacy "*" rule keeps generic crawlers (Bingbot, DuckDuckBot,
//      etc.) on the public surface and out of personalised app routes.
//   2. Explicit per-bot rules for every major AI crawler — this is a
//      *positive signal* to those tools that we welcome them. Some
//      operators block GPTBot/Claude/Perplexity as a privacy stance;
//      by explicitly allowing them we maximise the chance of being
//      cited in ChatGPT, Claude, Gemini, Perplexity, Grok, Kimi etc.
//   3. AI training-only bots (GPTBot, ClaudeBot, Google-Extended,
//      Applebot-Extended, Meta-ExternalAgent) get the same allowlist
//      as their live-search siblings — we want both the training
//      corpus inclusion AND live retrieval.
//
// Reference list of major AI crawlers (2025-2026):
//   - OpenAI: GPTBot (training), ChatGPT-User (browsing), OAI-SearchBot
//   - Anthropic: ClaudeBot (training), Claude-User (browsing), anthropic-ai
//   - Google: Googlebot (search), Google-Extended (Gemini/Bard training)
//   - Bing/Copilot: Bingbot
//   - Perplexity: PerplexityBot, Perplexity-User
//   - Apple Intelligence: Applebot, Applebot-Extended
//   - Meta AI: Meta-ExternalAgent, FacebookBot
//   - Common Crawl: CCBot (consumed by every open-source LLM provider)
//   - Mistral: MistralAI-User
//   - ByteDance (Doubao/TikTok): Bytespider
//   - You.com: YouBot
//   - DuckDuckGo AI: DuckAssistBot
//   - Amazon: Amazonbot
//   - Cohere: cohere-ai
//   - Diffbot (powers Perplexity and others): Diffbot
//   - Yandex: YandexBot (powers Yandex GPT)
//   - Baidu: Baiduspider (Ernie)

import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo/site";

const PUBLIC_ALLOW = [
  "/",
  "/companies",
  "/companies/",
  "/cities",
  "/cities/",
  "/roles",
  "/roles/",
  "/listings/",
  "/about",
  "/privacy",
  "/terms",
  "/dsa",
  "/dsa/",
  "/guides",
  "/guides/",
  "/compare",
  "/compare/",
  "/salaries",
  "/salaries/",
  "/skills",
  "/skills/",
  "/llms.txt",
  "/llms-full.txt",
  "/api/feed/jobs.json",
];

const PRIVATE_DISALLOW = [
  "/dashboard",
  "/matches",
  "/profile",
  "/applications",
  "/applications/",
  "/insights",
  "/coach",
  "/settings",
  "/settings/",
  "/jobs/",        // authenticated detail URL — public mirror lives at /listings/
  "/admin",
  "/admin/",
  "/api/",         // exception explicitly allowed above for the public jobs feed
  "/auth/",
  "/consent",
  "/unsubscribe",
  "/lab",
];

const AI_CRAWLERS = [
  // OpenAI
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  // Google AI
  "Google-Extended",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Apple Intelligence
  "Applebot-Extended",
  // Meta AI
  "Meta-ExternalAgent",
  "FacebookBot",
  // Common Crawl (training corpus for many open LLMs)
  "CCBot",
  // Mistral
  "MistralAI-User",
  // ByteDance
  "Bytespider",
  // You.com / DuckDuckGo AI
  "YouBot",
  "DuckAssistBot",
  // Misc
  "Amazonbot",
  "cohere-ai",
  "Diffbot",
  "Timpibot",
  "Webzio-Extended",
  "Omgilibot",
];

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();

  const aiRules = AI_CRAWLERS.map((userAgent) => ({
    userAgent,
    allow: PUBLIC_ALLOW,
    disallow: PRIVATE_DISALLOW,
  }));

  return {
    rules: [
      // Generic catch-all (Googlebot, Bingbot, DuckDuckBot, etc.).
      {
        userAgent: "*",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      ...aiRules,
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin.replace(/^https?:\/\//, ""),
  };
}
