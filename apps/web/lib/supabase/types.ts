// Hand-authored types for postgrest-js v2.105.1+
// Each table MUST include `Relationships: []` or it resolves to `never`.

export interface JsonObject { [key: string]: Json }
export type Json = string | number | boolean | null | JsonObject | Json[];

export type ConsentPurpose = "account" | "matching" | "digest_email" | "analytics";
export type ApplicationStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";
export type DigestFrequency = "weekly" | "off";
export type DpdpEventType =
  | "consent_granted" | "consent_revoked"
  | "export_requested" | "export_delivered"
  | "erasure_requested" | "erasure_completed";
export type CrawlStatus = "running" | "success" | "partial" | "failed";
export type SeniorityLevel = "intern" | "junior" | "mid" | "senior" | "staff" | "principal" | "lead" | "manager" | "director" | "vp";

export type Verdict = "strong_fit" | "stretch" | "underqualified" | "mismatch" | "off_target";

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
          applicants_count: number | null; freshness_score: number | null;
          apply_url: string | null; raw: Json | null;
          role_function: string | null;
          must_have_skills: string[] | null; nice_to_have_skills: string[] | null;
          jd_min_years: number | null; jd_max_years: number | null;
          work_mode: string | null; jd_seniority_signal: SeniorityLevel | null;
          jd_summary: string | null; jd_parsed_at: string | null;
          is_likely_ghost: boolean | null; ghost_signals: Json | null;
          embedding: number[] | null; embedding_at: string | null;
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
          applicants_count?: number | null; freshness_score?: number | null;
          apply_url?: string | null; raw?: Json | null;
          role_function?: string | null;
          must_have_skills?: string[] | null; nice_to_have_skills?: string[] | null;
          jd_min_years?: number | null; jd_max_years?: number | null;
          work_mode?: string | null; jd_seniority_signal?: SeniorityLevel | null;
          jd_summary?: string | null; jd_parsed_at?: string | null;
          is_likely_ghost?: boolean | null; ghost_signals?: Json | null;
          embedding?: number[] | null; embedding_at?: string | null;
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
          applicants_count?: number | null; freshness_score?: number | null;
          apply_url?: string | null; raw?: Json | null;
          role_function?: string | null;
          must_have_skills?: string[] | null; nice_to_have_skills?: string[] | null;
          jd_min_years?: number | null; jd_max_years?: number | null;
          work_mode?: string | null; jd_seniority_signal?: SeniorityLevel | null;
          jd_summary?: string | null; jd_parsed_at?: string | null;
          is_likely_ghost?: boolean | null; ghost_signals?: Json | null;
          embedding?: number[] | null; embedding_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string; display_name: string | null; current_role: string | null;
          years_experience: number | null; current_lpa: number | null;
          target_lpa: number | null; preferred_hubs: string[] | null;
          tech_stack: string[] | null; seniority: SeniorityLevel | null;
          resume_storage_path: string | null; resume_parsed: Json | null;
          product_dna_score: number | null;
          coach_plan: Json | null; coach_plan_at: string | null;
          role_function: string | null; target_role_functions: string[] | null;
          resume_score: number | null; resume_score_breakdown: Json | null;
          resume_tips: Json | null; resume_score_at: string | null;
          resume_embedding: number[] | null; resume_embedding_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id: string; display_name?: string | null; current_role?: string | null;
          years_experience?: number | null; current_lpa?: number | null;
          target_lpa?: number | null; preferred_hubs?: string[] | null;
          tech_stack?: string[] | null; seniority?: SeniorityLevel | null;
          resume_storage_path?: string | null; resume_parsed?: Json | null;
          product_dna_score?: number | null;
          coach_plan?: Json | null; coach_plan_at?: string | null;
          role_function?: string | null; target_role_functions?: string[] | null;
          resume_score?: number | null; resume_score_breakdown?: Json | null;
          resume_tips?: Json | null; resume_score_at?: string | null;
          resume_embedding?: number[] | null; resume_embedding_at?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; display_name?: string | null; current_role?: string | null;
          years_experience?: number | null; current_lpa?: number | null;
          target_lpa?: number | null; preferred_hubs?: string[] | null;
          tech_stack?: string[] | null; seniority?: SeniorityLevel | null;
          resume_storage_path?: string | null; resume_parsed?: Json | null;
          product_dna_score?: number | null;
          coach_plan?: Json | null; coach_plan_at?: string | null;
          role_function?: string | null; target_role_functions?: string[] | null;
          resume_score?: number | null; resume_score_breakdown?: Json | null;
          resume_tips?: Json | null; resume_score_at?: string | null;
          resume_embedding?: number[] | null; resume_embedding_at?: string | null;
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
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; job_id: string; score: number;
          strengths?: string[] | null; gaps?: string[] | null;
          reasoning?: string | null; computed_at?: string;
          verdict?: Verdict | null; fit_card?: Json | null;
          fit_card_at?: string | null; hidden_reason?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; user_id?: string; job_id?: string; score?: number;
          strengths?: string[] | null; gaps?: string[] | null;
          reasoning?: string | null; computed_at?: string;
          verdict?: Verdict | null; fit_card?: Json | null;
          fit_card_at?: string | null; hidden_reason?: string | null;
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
