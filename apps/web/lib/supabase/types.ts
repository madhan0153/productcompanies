// Hand-authored types for postgrest-js v2.105.1+
// Each table MUST include `Relationships: []` or it resolves to `never`.

export interface JsonObject { [key: string]: Json }
export type Json = string | number | boolean | null | JsonObject | Json[];

export type ConsentPurpose = "account" | "matching" | "digest_email" | "analytics" | "resume_intelligence" | "notifications";
export type ApplicationStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";
export type DigestFrequency = "weekly" | "off";
export type DpdpEventType =
  | "consent_granted" | "consent_revoked"
  | "export_requested" | "export_delivered"
  | "erasure_requested" | "erasure_completed";
export type CrawlStatus = "running" | "success" | "partial" | "failed";
export type SeniorityLevel = "intern" | "junior" | "mid" | "senior" | "staff" | "principal" | "lead" | "manager" | "director" | "vp";

export type Verdict = "strong_fit" | "stretch" | "underqualified" | "mismatch" | "off_target";
export type BillingProvider = "dodo" | "razorpay" | "stripe" | "manual";
export type BillingPlan = "free" | "pro" | "career_sprint";
export type SubscriptionStatus = "incomplete" | "active" | "trialing" | "on_hold" | "past_due" | "cancelled" | "expired" | "failed";
export type CreditKind = "tailored_resume" | "resume_reparse" | "priority_recompute";
export type EntitlementGrantType = "pro_12_months" | "pro_lifetime" | "career_sprint_3_months" | "credits_fixed";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string; slug: string; name: string; careers_url: string | null;
          logo_url: string | null; hubs: string[] | null; crawler_config: Json | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; slug: string; name: string; careers_url?: string | null;
          logo_url?: string | null; hubs?: string[] | null; crawler_config?: Json | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; slug?: string; name?: string; careers_url?: string | null;
          logo_url?: string | null; hubs?: string[] | null; crawler_config?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string; company_id: string; external_id: string; signature: string | null;
          title: string; description: string | null; location: string | null;
          hubs: string[] | null; min_experience_years: number | null;
          max_experience_years: number | null; comp_lpa_min: number | null;
          comp_lpa_max: number | null; tech_stack: string[] | null;
          seniority: SeniorityLevel | null; posted_at: string | null;
          last_seen_at: string | null; is_active: boolean;
          freshness_score: number | null;
          apply_url: string | null; raw: Json | null;
          role_function: string | null;
          must_have_skills: string[] | null; nice_to_have_skills: string[] | null;
          jd_min_years: number | null; jd_max_years: number | null;
          work_mode: string | null; jd_seniority_signal: SeniorityLevel | null;
          jd_summary: string | null; jd_parsed_at: string | null;
          is_likely_ghost: boolean | null; ghost_signals: Json | null;
          embedding: number[] | null; embedding_at: string | null;
          apply_click_count: number;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; company_id: string; external_id: string; signature?: string | null;
          title: string; description?: string | null; location?: string | null;
          hubs?: string[] | null; min_experience_years?: number | null;
          max_experience_years?: number | null; comp_lpa_min?: number | null;
          comp_lpa_max?: number | null; tech_stack?: string[] | null;
          seniority?: SeniorityLevel | null; posted_at?: string | null;
          last_seen_at?: string | null; is_active?: boolean;
          freshness_score?: number | null;
          apply_url?: string | null; raw?: Json | null;
          role_function?: string | null;
          must_have_skills?: string[] | null; nice_to_have_skills?: string[] | null;
          jd_min_years?: number | null; jd_max_years?: number | null;
          work_mode?: string | null; jd_seniority_signal?: SeniorityLevel | null;
          jd_summary?: string | null; jd_parsed_at?: string | null;
          is_likely_ghost?: boolean | null; ghost_signals?: Json | null;
          embedding?: number[] | null; embedding_at?: string | null;
          apply_click_count?: number;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; company_id?: string; external_id?: string; signature?: string | null;
          title?: string; description?: string | null; location?: string | null;
          hubs?: string[] | null; min_experience_years?: number | null;
          max_experience_years?: number | null; comp_lpa_min?: number | null;
          comp_lpa_max?: number | null; tech_stack?: string[] | null;
          seniority?: SeniorityLevel | null; posted_at?: string | null;
          last_seen_at?: string | null; is_active?: boolean;
          freshness_score?: number | null;
          apply_url?: string | null; raw?: Json | null;
          role_function?: string | null;
          must_have_skills?: string[] | null; nice_to_have_skills?: string[] | null;
          jd_min_years?: number | null; jd_max_years?: number | null;
          work_mode?: string | null; jd_seniority_signal?: SeniorityLevel | null;
          jd_summary?: string | null; jd_parsed_at?: string | null;
          is_likely_ghost?: boolean | null; ghost_signals?: Json | null;
          embedding?: number[] | null; embedding_at?: string | null;
          apply_click_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      tailored_resumes: {
        Row: {
          id: string; user_id: string; job_id: string;
          content: Json; docx_storage_path: string | null;
          resume_signature: string | null; job_signature: string | null;
          generated_at: string; updated_at: string;
          /** Phase R1 — diff-review workflow */
          diagnosis: Json | null;
          extracted_resume: Json | null;
          rewrites: Json | null;
          decisions: Json | null;
          pdf_storage_path: string | null;
          mode: "polish" | "tailor" | null;
          status: "pending_review" | "finalised" | "discarded";
        };
        Insert: {
          id?: string; user_id: string; job_id: string;
          content: Json; docx_storage_path?: string | null;
          resume_signature?: string | null; job_signature?: string | null;
          generated_at?: string; updated_at?: string;
          diagnosis?: Json | null;
          extracted_resume?: Json | null;
          rewrites?: Json | null;
          decisions?: Json | null;
          pdf_storage_path?: string | null;
          mode?: "polish" | "tailor" | null;
          status?: "pending_review" | "finalised" | "discarded";
        };
        Update: {
          id?: string; user_id?: string; job_id?: string;
          content?: Json; docx_storage_path?: string | null;
          resume_signature?: string | null; job_signature?: string | null;
          generated_at?: string; updated_at?: string;
          diagnosis?: Json | null;
          extracted_resume?: Json | null;
          rewrites?: Json | null;
          decisions?: Json | null;
          pdf_storage_path?: string | null;
          mode?: "polish" | "tailor" | null;
          status?: "pending_review" | "finalised" | "discarded";
        };
        Relationships: [];
      };
      enhanced_resumes: {
        Row: {
          id: string; user_id: string;
          source_resume_signature: string;
          target_role_function: string | null;
          market_keywords: string[];
          diagnosis: Json;
          rewrites: Json;
          ats_before: Json;
          ats_after: Json | null;
          decisions: Json;
          enhanced_content: Json | null;
          docx_storage_path: string | null;
          pdf_storage_path: string | null;
          status: "pending_review" | "finalised" | "discarded";
          generated_at: string;
          finalised_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string; user_id: string;
          source_resume_signature: string;
          target_role_function?: string | null;
          market_keywords?: string[];
          diagnosis: Json;
          rewrites?: Json;
          ats_before: Json;
          ats_after?: Json | null;
          decisions?: Json;
          enhanced_content?: Json | null;
          docx_storage_path?: string | null;
          pdf_storage_path?: string | null;
          status?: "pending_review" | "finalised" | "discarded";
          generated_at?: string;
          finalised_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string; user_id?: string;
          source_resume_signature?: string;
          target_role_function?: string | null;
          market_keywords?: string[];
          diagnosis?: Json;
          rewrites?: Json;
          ats_before?: Json;
          ats_after?: Json | null;
          decisions?: Json;
          enhanced_content?: Json | null;
          docx_storage_path?: string | null;
          pdf_storage_path?: string | null;
          status?: "pending_review" | "finalised" | "discarded";
          finalised_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      resume_intel_events: {
        Row: {
          id: string; user_id: string;
          kind: string; scope: string; scope_ref_id: string | null;
          llm_tier: string | null;
          cost_tokens_in: number | null; cost_tokens_out: number | null;
          latency_ms: number | null;
          ok: boolean; error_kind: string | null;
          created_at: string;
        };
        Insert: {
          id?: string; user_id: string;
          kind: string; scope: string; scope_ref_id?: string | null;
          llm_tier?: string | null;
          cost_tokens_in?: number | null; cost_tokens_out?: number | null;
          latency_ms?: number | null;
          ok: boolean; error_kind?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      billing_customers: {
        Row: {
          user_id: string; dodo_customer_id: string | null; razorpay_customer_id: string | null;
          stripe_customer_id: string | null; billing_email: string | null;
          country: string | null; currency: string; created_at: string; updated_at: string;
        };
        Insert: {
          user_id: string; dodo_customer_id?: string | null; razorpay_customer_id?: string | null;
          stripe_customer_id?: string | null; billing_email?: string | null;
          country?: string | null; currency?: string; created_at?: string; updated_at?: string;
        };
        Update: {
          user_id?: string; dodo_customer_id?: string | null; razorpay_customer_id?: string | null;
          stripe_customer_id?: string | null; billing_email?: string | null;
          country?: string | null; currency?: string; updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string; user_id: string; provider: BillingProvider;
          provider_customer_id: string | null; provider_subscription_id: string | null;
          provider_product_id: string | null; plan: BillingPlan; status: SubscriptionStatus;
          current_period_start: string | null; current_period_end: string | null;
          cancel_at_period_end: boolean; cancelled_at: string | null;
          metadata: Json; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; provider: BillingProvider;
          provider_customer_id?: string | null; provider_subscription_id?: string | null;
          provider_product_id?: string | null; plan: BillingPlan; status?: SubscriptionStatus;
          current_period_start?: string | null; current_period_end?: string | null;
          cancel_at_period_end?: boolean; cancelled_at?: string | null;
          metadata?: Json; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; user_id?: string; provider?: BillingProvider;
          provider_customer_id?: string | null; provider_subscription_id?: string | null;
          provider_product_id?: string | null; plan?: BillingPlan; status?: SubscriptionStatus;
          current_period_start?: string | null; current_period_end?: string | null;
          cancel_at_period_end?: boolean; cancelled_at?: string | null;
          metadata?: Json; updated_at?: string;
        };
        Relationships: [];
      };
      user_entitlements: {
        Row: {
          user_id: string; plan: BillingPlan; source: string; active_until: string | null;
          tailored_resume_limit: number; priority_level: number; feature_flags: Json;
          refreshed_at: string; created_at: string; updated_at: string;
        };
        Insert: {
          user_id: string; plan?: BillingPlan; source?: string; active_until?: string | null;
          tailored_resume_limit?: number; priority_level?: number; feature_flags?: Json;
          refreshed_at?: string; created_at?: string; updated_at?: string;
        };
        Update: {
          user_id?: string; plan?: BillingPlan; source?: string; active_until?: string | null;
          tailored_resume_limit?: number; priority_level?: number; feature_flags?: Json;
          refreshed_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      credit_ledger: {
        Row: {
          id: string; user_id: string; kind: CreditKind; amount: number; reason: string;
          reference_key: string | null; expires_at: string | null; metadata: Json; created_at: string;
        };
        Insert: {
          id?: string; user_id: string; kind: CreditKind; amount: number; reason: string;
          reference_key?: string | null; expires_at?: string | null; metadata?: Json; created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      payment_events: {
        Row: {
          id: string; provider: BillingProvider; provider_event_id: string; event_type: string;
          user_id: string | null; processed_at: string | null; processing_error: string | null;
          payload: Json; created_at: string;
        };
        Insert: {
          id?: string; provider: BillingProvider; provider_event_id: string; event_type: string;
          user_id?: string | null; processed_at?: string | null; processing_error?: string | null;
          payload?: Json; created_at?: string;
        };
        Update: { processed_at?: string | null; processing_error?: string | null; user_id?: string | null; payload?: Json };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string; user_id: string; provider: BillingProvider; provider_invoice_id: string | null;
          provider_payment_id: string | null; subscription_id: string | null; amount: number;
          currency: string; status: string; hosted_invoice_url: string | null; receipt_url: string | null;
          tax_amount: number | null; metadata: Json; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; provider: BillingProvider; provider_invoice_id?: string | null;
          provider_payment_id?: string | null; subscription_id?: string | null; amount: number;
          currency?: string; status: string; hosted_invoice_url?: string | null; receipt_url?: string | null;
          tax_amount?: number | null; metadata?: Json; created_at?: string; updated_at?: string;
        };
        Update: {
          status?: string; hosted_invoice_url?: string | null; receipt_url?: string | null;
          tax_amount?: number | null; metadata?: Json; updated_at?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          id: string; user_id: string; invoice_id: string | null; provider: BillingProvider;
          provider_refund_id: string | null; amount: number | null; currency: string;
          status: string; reason: string | null; metadata: Json; requested_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; invoice_id?: string | null; provider: BillingProvider;
          provider_refund_id?: string | null; amount?: number | null; currency?: string;
          status?: string; reason?: string | null; metadata?: Json; requested_at?: string; updated_at?: string;
        };
        Update: {
          provider_refund_id?: string | null; amount?: number | null; status?: string;
          reason?: string | null; metadata?: Json; updated_at?: string;
        };
        Relationships: [];
      };
      promo_codes: {
        Row: {
          id: string; code_label: string | null; code_hash: string; salt: string;
          grant_type: EntitlementGrantType; credit_kind: CreditKind | null;
          credit_amount: number | null; duration_days: number | null;
          max_redemptions: number | null; redeemed_count: number;
          expires_at: string | null; is_active: boolean; created_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; code_label?: string | null; code_hash: string; salt?: string;
          grant_type: EntitlementGrantType; credit_kind?: CreditKind | null;
          credit_amount?: number | null; duration_days?: number | null;
          max_redemptions?: number | null; redeemed_count?: number;
          expires_at?: string | null; is_active?: boolean; created_by?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          redeemed_count?: number; is_active?: boolean; updated_at?: string;
        };
        Relationships: [];
      };
      promo_redemptions: {
        Row: { id: string; promo_code_id: string; user_id: string; redeemed_at: string };
        Insert: { id?: string; promo_code_id: string; user_id: string; redeemed_at?: string };
        Update: never;
        Relationships: [];
      };
      entitlement_grants: {
        Row: {
          id: string; user_id: string; grant_type: EntitlementGrantType; plan: BillingPlan | null;
          credit_kind: CreditKind | null; credit_amount: number | null; starts_at: string;
          expires_at: string | null; source: string; source_ref: string | null; reason: string | null;
          granted_by: string | null; revoked_at: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; grant_type: EntitlementGrantType; plan?: BillingPlan | null;
          credit_kind?: CreditKind | null; credit_amount?: number | null; starts_at?: string;
          expires_at?: string | null; source: string; source_ref?: string | null; reason?: string | null;
          granted_by?: string | null; revoked_at?: string | null; created_at?: string; updated_at?: string;
        };
        Update: { revoked_at?: string | null; updated_at?: string };
        Relationships: [];
      };
      negotiation_memos: {
        Row: {
          id: string; user_id: string; job_id: string;
          content: Json; market_comp: Json | null;
          resume_signature: string | null; job_signature: string | null;
          candidate_target_lpa: number | null; candidate_current_lpa: number | null;
          generated_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; job_id: string;
          content: Json; market_comp?: Json | null;
          resume_signature?: string | null; job_signature?: string | null;
          candidate_target_lpa?: number | null; candidate_current_lpa?: number | null;
          generated_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; user_id?: string; job_id?: string;
          content?: Json; market_comp?: Json | null;
          resume_signature?: string | null; job_signature?: string | null;
          candidate_target_lpa?: number | null; candidate_current_lpa?: number | null;
          generated_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      resume_versions: {
        Row: {
          id: string; user_id: string; resume_parsed: Json;
          resume_storage_path: string | null;
          product_dna_score: number | null; dna_breakdown: Json | null;
          resume_signature: string | null;
          source: "overwrite" | "manual_revert" | "json_import" | "editor";
          created_at: string;
        };
        Insert: {
          id?: string; user_id: string; resume_parsed: Json;
          resume_storage_path?: string | null;
          product_dna_score?: number | null; dna_breakdown?: Json | null;
          resume_signature?: string | null;
          source?: "overwrite" | "manual_revert" | "json_import" | "editor";
          created_at?: string;
        };
        Update: {
          id?: string; user_id?: string; resume_parsed?: Json;
          resume_storage_path?: string | null;
          product_dna_score?: number | null; dna_breakdown?: Json | null;
          resume_signature?: string | null;
          source?: "overwrite" | "manual_revert" | "json_import" | "editor";
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string; display_name: string | null; current_role: string | null;
          job_title: string | null;
          years_experience: number | null; current_lpa: number | null;
          target_lpa: number | null; preferred_hubs: string[] | null;
          tech_stack: string[] | null; seniority: SeniorityLevel | null;
          resume_storage_path: string | null; resume_parsed: Json | null;
          resume_parse_error: string | null; resume_parsing_at: string | null;
          product_dna_score: number | null; dna_breakdown: Json | null;
          resume_signature: string | null;
          coach_plan: Json | null; coach_plan_at: string | null;
          role_function: string | null; target_role_functions: string[] | null;
          resume_score: number | null; resume_score_breakdown: Json | null;
          resume_tips: Json | null; resume_score_at: string | null;
          resume_embedding: number[] | null; resume_embedding_at: string | null;
          last_match_compute_at: string | null;
          suspended_at: string | null; suspension_reason: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id: string; display_name?: string | null; current_role?: string | null;
          job_title?: string | null;
          years_experience?: number | null; current_lpa?: number | null;
          target_lpa?: number | null; preferred_hubs?: string[] | null;
          tech_stack?: string[] | null; seniority?: SeniorityLevel | null;
          resume_storage_path?: string | null; resume_parsed?: Json | null;
          resume_parse_error?: string | null; resume_parsing_at?: string | null;
          product_dna_score?: number | null; dna_breakdown?: Json | null;
          resume_signature?: string | null;
          coach_plan?: Json | null; coach_plan_at?: string | null;
          role_function?: string | null; target_role_functions?: string[] | null;
          resume_score?: number | null; resume_score_breakdown?: Json | null;
          resume_tips?: Json | null; resume_score_at?: string | null;
          resume_embedding?: number[] | null; resume_embedding_at?: string | null;
          last_match_compute_at?: string | null;
          suspended_at?: string | null; suspension_reason?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; display_name?: string | null; current_role?: string | null;
          job_title?: string | null;
          years_experience?: number | null; current_lpa?: number | null;
          target_lpa?: number | null; preferred_hubs?: string[] | null;
          tech_stack?: string[] | null; seniority?: SeniorityLevel | null;
          resume_storage_path?: string | null; resume_parsed?: Json | null;
          resume_parse_error?: string | null; resume_parsing_at?: string | null;
          product_dna_score?: number | null; dna_breakdown?: Json | null;
          resume_signature?: string | null;
          coach_plan?: Json | null; coach_plan_at?: string | null;
          role_function?: string | null; target_role_functions?: string[] | null;
          resume_score?: number | null; resume_score_breakdown?: Json | null;
          resume_tips?: Json | null; resume_score_at?: string | null;
          resume_embedding?: number[] | null; resume_embedding_at?: string | null;
          last_match_compute_at?: string | null;
          suspended_at?: string | null; suspension_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      consents: {
        Row: {
          id: string; user_id: string; purpose: ConsentPurpose; granted: boolean;
          granted_at: string | null; revoked_at: string | null;
          policy_version: string; created_at: string;
        };
        Insert: {
          id?: string; user_id: string; purpose: ConsentPurpose; granted: boolean;
          granted_at?: string | null; revoked_at?: string | null;
          policy_version: string; created_at?: string;
        };
        Update: {
          id?: string; user_id?: string; purpose?: ConsentPurpose; granted?: boolean;
          granted_at?: string | null; revoked_at?: string | null; policy_version?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string; user_id: string; job_id: string; score: number;
          strengths: string[] | null; gaps: string[] | null;
          reasoning: string | null; computed_at: string;
          verdict: Verdict | null; fit_card: Json | null;
          fit_card_at: string | null; hidden_reason: string | null;
          score_breakdown: Json | null;
          user_hidden: boolean; hidden_at: string | null;
          fit_card_resume_signature: string | null;
          fit_card_jd_signature: string | null;
          seen_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; job_id: string; score: number;
          strengths?: string[] | null; gaps?: string[] | null;
          reasoning?: string | null; computed_at?: string;
          verdict?: Verdict | null; fit_card?: Json | null;
          fit_card_at?: string | null; hidden_reason?: string | null;
          score_breakdown?: Json | null;
          user_hidden?: boolean; hidden_at?: string | null;
          fit_card_resume_signature?: string | null;
          fit_card_jd_signature?: string | null;
          seen_at?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; user_id?: string; job_id?: string; score?: number;
          strengths?: string[] | null; gaps?: string[] | null;
          reasoning?: string | null; computed_at?: string;
          verdict?: Verdict | null; fit_card?: Json | null;
          fit_card_at?: string | null; hidden_reason?: string | null;
          score_breakdown?: Json | null;
          user_hidden?: boolean; hidden_at?: string | null;
          fit_card_resume_signature?: string | null;
          fit_card_jd_signature?: string | null;
          seen_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string; user_id: string; job_id: string; status: ApplicationStatus;
          applied_at: string | null; notes: string | null; next_action_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; job_id: string; status: ApplicationStatus;
          applied_at?: string | null; notes?: string | null; next_action_at?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; user_id?: string; job_id?: string; status?: ApplicationStatus;
          applied_at?: string | null; notes?: string | null; next_action_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      interview_notes: {
        Row: {
          id: string; application_id: string; round: string | null;
          interviewer: string | null; notes: string | null; created_at: string;
        };
        Insert: {
          id?: string; application_id: string; round?: string | null;
          interviewer?: string | null; notes?: string | null; created_at?: string;
        };
        Update: {
          id?: string; application_id?: string; round?: string | null;
          interviewer?: string | null; notes?: string | null;
        };
        Relationships: [];
      };
      stories: {
        Row: {
          id: string; user_id: string; title: string; situation: string | null;
          task: string | null; action: string | null; result: string | null;
          tags: string[] | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; title: string; situation?: string | null;
          task?: string | null; action?: string | null; result?: string | null;
          tags?: string[] | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; user_id?: string; title?: string; situation?: string | null;
          task?: string | null; action?: string | null; result?: string | null;
          tags?: string[] | null; updated_at?: string;
        };
        Relationships: [];
      };
      offers: {
        Row: {
          id: string; user_id: string; company_id: string;
          base_lpa: number | null; variable_lpa: number | null;
          esop_value_lpa: number | null; joining_bonus: number | null;
          notes: string | null; created_at: string;
        };
        Insert: {
          id?: string; user_id: string; company_id: string;
          base_lpa?: number | null; variable_lpa?: number | null;
          esop_value_lpa?: number | null; joining_bonus?: number | null;
          notes?: string | null; created_at?: string;
        };
        Update: {
          id?: string; user_id?: string; company_id?: string;
          base_lpa?: number | null; variable_lpa?: number | null;
          esop_value_lpa?: number | null; joining_bonus?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      digest_subscriptions: {
        Row: {
          id: string; user_id: string; frequency: DigestFrequency;
          last_sent_at: string | null; next_send_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; frequency: DigestFrequency;
          last_sent_at?: string | null; next_send_at?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; user_id?: string; frequency?: DigestFrequency;
          last_sent_at?: string | null; next_send_at?: string | null; updated_at?: string;
        };
        Relationships: [];
      };
      crawl_runs: {
        Row: {
          id: string; company_id: string; started_at: string; finished_at: string | null;
          jobs_seen: number; jobs_new: number; jobs_updated: number;
          jobs_marked_stale: number; status: CrawlStatus; error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string; company_id: string; started_at: string; finished_at?: string | null;
          jobs_seen?: number; jobs_new?: number; jobs_updated?: number;
          jobs_marked_stale?: number; status: CrawlStatus; error?: string | null;
          created_at?: string;
        };
        Update: {
          finished_at?: string | null; jobs_seen?: number; jobs_new?: number;
          jobs_updated?: number; jobs_marked_stale?: number;
          status?: CrawlStatus; error?: string | null;
        };
        Relationships: [];
      };
      dpdp_events: {
        Row: {
          id: string; user_id: string; event: DpdpEventType;
          metadata: Json | null; created_at: string;
        };
        Insert: {
          id?: string; user_id: string; event: DpdpEventType;
          metadata?: Json | null; created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      background_jobs: {
        Row: {
          id: string; user_id: string | null; job_type: string; status: string;
          payload: Json; error_code: string | null; error_message: string | null;
          queued_at: string; started_at: string | null; finished_at: string | null;
          attempts: number | null;
        };
        Insert: {
          id?: string; user_id?: string | null; job_type: string; status?: string;
          payload?: Json; error_code?: string | null; error_message?: string | null;
          queued_at?: string; started_at?: string | null; finished_at?: string | null;
          attempts?: number | null;
        };
        Update: {
          status?: string; error_code?: string | null; error_message?: string | null;
          started_at?: string | null; finished_at?: string | null; attempts?: number | null;
        };
        Relationships: [];
      };
      admin_actions: {
        Row: {
          id: string; actor_id: string | null; actor_email: string;
          action_type: string; target_user_id: string | null; target_ref: string | null;
          status: string; metadata: Json; created_at: string;
        };
        Insert: {
          id?: string; actor_id?: string | null; actor_email: string;
          action_type: string; target_user_id?: string | null; target_ref?: string | null;
          status?: string; metadata?: Json; created_at?: string;
        };
        Update: {
          status?: string; metadata?: Json;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string; user_id: string; endpoint: string; p256dh: string; auth: string;
          user_agent: string | null; device_name: string | null; created_at: string;
          updated_at: string; last_used_at: string | null; last_success_at: string | null;
          last_failure_at: string | null; failure_count: number; disabled_at: string | null;
        };
        Insert: {
          id?: string; user_id: string; endpoint: string; p256dh: string; auth: string;
          user_agent?: string | null; device_name?: string | null; created_at?: string;
          updated_at?: string; last_used_at?: string | null; last_success_at?: string | null;
          last_failure_at?: string | null; failure_count?: number; disabled_at?: string | null;
        };
        Update: {
          endpoint?: string; p256dh?: string; auth?: string; user_agent?: string | null; device_name?: string | null;
          updated_at?: string; last_used_at?: string | null; last_success_at?: string | null;
          last_failure_at?: string | null; failure_count?: number; disabled_at?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string; user_id: string; type: string; title: string; body: string | null;
          url: string | null; data: Json; priority: string; idempotency_key: string | null;
          status: string; scheduled_at: string | null; sent_at: string | null;
          expires_at: string | null; created_at: string; read_at: string | null;
          clicked_at: string | null; dismissed_at: string | null;
        };
        Insert: {
          id?: string; user_id: string; type: string; title: string; body?: string | null;
          url?: string | null; data?: Json; priority?: string; idempotency_key?: string | null;
          status?: string; scheduled_at?: string | null; sent_at?: string | null;
          expires_at?: string | null; created_at?: string; read_at?: string | null;
          clicked_at?: string | null; dismissed_at?: string | null;
        };
        Update: {
          status?: string; sent_at?: string | null; read_at?: string | null;
          clicked_at?: string | null; dismissed_at?: string | null;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string; push_enabled: boolean; timezone: string;
          quiet_hours_enabled: boolean; quiet_hours_start: string; quiet_hours_end: string;
          detailed_content: boolean; category_frequencies: Json;
          created_at: string; updated_at: string;
        };
        Insert: {
          user_id: string; push_enabled?: boolean; timezone?: string;
          quiet_hours_enabled?: boolean; quiet_hours_start?: string; quiet_hours_end?: string;
          detailed_content?: boolean; category_frequencies?: Json;
          created_at?: string; updated_at?: string;
        };
        Update: {
          push_enabled?: boolean; timezone?: string; quiet_hours_enabled?: boolean;
          quiet_hours_start?: string; quiet_hours_end?: string; detailed_content?: boolean;
          category_frequencies?: Json; updated_at?: string;
        };
        Relationships: [];
      };
      notification_delivery_attempts: {
        Row: {
          id: string; notification_id: string; subscription_id: string | null;
          attempt_no: number; status: string; provider_status: number | null;
          failure_class: string | null; attempted_at: string; next_retry_at: string | null;
        };
        Insert: {
          id?: string; notification_id: string; subscription_id?: string | null;
          attempt_no?: number; status: string; provider_status?: number | null;
          failure_class?: string | null; attempted_at?: string; next_retry_at?: string | null;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>;
    Functions: {
      mark_stale_jobs: { Args: { company_uuid: string; run_started: string }; Returns: number };
      compute_freshness: { Args: { posted_at: string | null; last_seen_at: string | null }; Returns: number };
      request_user_erasure: { Args: { uid: string }; Returns: void };
    };
    Enums: {
      consent_purpose: ConsentPurpose;
      application_status: ApplicationStatus;
      digest_frequency: DigestFrequency;
      dpdp_event_type: DpdpEventType;
      crawl_status: CrawlStatus;
      seniority_level: SeniorityLevel;
    };
    CompositeTypes: Record<string, never>;
  };
}
