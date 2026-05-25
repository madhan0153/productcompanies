import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink, MapPin, Briefcase, Calendar,
  CheckCircle2, AlertCircle, TrendingUp, Target,
  ChevronRight, ShieldCheck,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreRing } from "@/components/score-ring";
import { Tooltip } from "@/components/tooltip";
import { SectionCard } from "@/components/section-card";
import { StaggerList } from "@/components/stagger-list";
import { JobActions } from "./job-actions";
import { StickyApplyBar } from "./sticky-apply-bar";
import { JobDescription } from "./job-description";
import { FitCardPanel, type FitCardData } from "./fit-card";
import { ScoreEvidence } from "./score-evidence";
import { SmartMatchesBackLink } from "./smart-back";
import { TailorPanel, RecruiterPanel } from "./apply-toolkit";
import { RecruiterView } from "@/components/recruiter-view";
import { computeAtsView } from "@/lib/matching/ats-view";
import { getUserConsents } from "@/lib/dpdp/consent";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { JobDetailTabs, type JobTabId } from "./job-detail-tabs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

...TRUNCATED