"use client";

// Mobile-first JSON Resume editor with multi-template preview.
//
// One stateful client component to keep this self-contained — the JSON
// payload is small enough that lifting individual sections into separate
// components isn't worth the wiring overhead. The shape is a tree of
// accordions, each section is a controlled form, and Save persists the
// whole document via a server action.
//
// Privacy: this component holds the user's resume in memory while editing.
// We do NOT log it, do NOT send it to any analytics endpoint, and clear
// the file-picker input after import. Server-side validation is the source
// of truth — client-side checks are advisory only.

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Save, Upload, Download, Eye, Plus, Trash2, ChevronDown,
  Loader2, CheckCircle2, AlertTriangle, FileText,
} from "lucide-react";
import type {
  JsonResume,
  JsonResumeWork,
  JsonResumeEducation,
  JsonResumeSkill,
  JsonResumeProject,
  JsonResumeCertificate,
  JsonResumeLanguage,
} from "@prodmatch/shared";
import { saveResumeJson } from "./actions";

type DerivedFrom = "json" | "parsed" | "empty";

interface ResumeEditorProps {
  initial: JsonResume;
  derivedFrom: DerivedFrom;
}

type Section =
  | "basics" | "work" | "education" | "skills"
  | "projects" | "certificates" | "languages" | "awards";

const SECTION_LABEL: Record<Section, string> = {
  basics: "Basics",
  work: "Work experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certificates: "Certifications",
  languages: "Languages",
  awards: "Awards",
};

export function ResumeEditor({ initial, derivedFrom }: ResumeEditorProps) {
  const [doc, setDoc] = useState<JsonResume>(initial);
  const [open, setOpen] = useState<Record<Section, boolean>>({
    basics: true, work: true, education: false, skills: false,
    projects: false, certificates: false, languages: false, awards: false,
  });
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const counts = useMemo(
    () => ({
      work: doc.work.length,
      education: doc.education.length,
      skills: doc.skills.length,
      projects: doc.projects.length,
      certificates: doc.certificates.length,
      languages: doc.languages.length,
      awards: doc.awards.length,
    }),
    [doc],
  );

  function handleSave() {
    startTransition(async () => {
      const res = await saveResumeJson(doc);
      if (res.ok) {
        setFlash({ kind: "ok", text: "Resume saved." });
        // Clear flash after 3s.
        setTimeout(() => setFlash(null), 3000);
      } else {
        setFlash({ kind: "err", text: res.error ?? "Save failed." });
      }
    });
  }

  async function handleImportFile(file: File) {
    if (file.size > 256 * 1024) {
      setFlash({ kind: "err", text: "File too large (max 256 KB)." });
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/resume/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFlash({ kind: "err", text: body.error ?? "Import failed." });
        return;
      }
      // Reload to pick up the new version. Avoid stuffing the parsed JSON
      // into client state directly so server-side mapping is always the
      // source of truth.
      window.location.reload();
    } catch {
      setFlash({ kind: "err", text: "File is not valid JSON." });
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(0,360px)]">
      {/* ── Editor column ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <Toolbar
          pending={pending}
          flash={flash}
          derivedFrom={derivedFrom}
          onSave={handleSave}
          onImportClick={() => importInput.current?.click()}
        />
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportFile(f);
          }}
        />

        <Accordion
          section="basics"
          label={SECTION_LABEL.basics}
          isOpen={open.basics}
          onToggle={() => setOpen((s) => ({ ...s, basics: !s.basics }))}
          subtitle="Name, contact, summary"
        >
          <BasicsForm doc={doc} setDoc={setDoc} />
        </Accordion>

        <Accordion
          section="work"
          label={SECTION_LABEL.work}
          isOpen={open.work}
          onToggle={() => setOpen((s) => ({ ...s, work: !s.work }))}
          subtitle={`${counts.work} role${counts.work === 1 ? "" : "s"}`}
        >
          <WorkForm doc={doc} setDoc={setDoc} />
        </Accordion>

        <Accordion
          section="education"
          label={SECTION_LABEL.education}
          isOpen={open.education}
          onToggle={() => setOpen((s) => ({ ...s, education: !s.education }))}
          subtitle={`${counts.education} degree${counts.education === 1 ? "" : "s"}`}
        >
          <EducationForm doc={doc} setDoc={setDoc} />
        </Accordion>

        <Accordion
          section="skills"
          label={SECTION_LABEL.skills}
          isOpen={open.skills}
          onToggle={() => setOpen((s) => ({ ...s, skills: !s.skills }))}
          subtitle={`${counts.skills} group${counts.skills === 1 ? "" : "s"}`}
        >
          <SkillsForm doc={doc} setDoc={setDoc} />
        </Accordion>

        <Accordion
          section="projects"
          label={SECTION_LABEL.projects}
          isOpen={open.projects}
          onToggle={() => setOpen((s) => ({ ...s, projects: !s.projects }))}
          subtitle={`${counts.projects} project${counts.projects === 1 ? "" : "s"}`}
        >
          <ProjectsForm doc={doc} setDoc={setDoc} />
        </Accordion>

        <Accordion
          section="certificates"
          label={SECTION_LABEL.certificates}
          isOpen={open.certificates}
          onToggle={() => setOpen((s) => ({ ...s, certificates: !s.certificates }))}
          subtitle={`${counts.certificates} certificate${counts.certificates === 1 ? "" : "s"}`}
        >
          <CertificatesForm doc={doc} setDoc={setDoc} />
        </Accordion>

        <Accordion
          section="languages"
          label={SECTION_LABEL.languages}
          isOpen={open.languages}
          onToggle={() => setOpen((s) => ({ ...s, languages: !s.languages }))}
          subtitle={`${counts.languages} language${counts.languages === 1 ? "" : "s"}`}
        >
          <LanguagesForm doc={doc} setDoc={setDoc} />
        </Accordion>

        {/* Sticky save bar on mobile */}
        <div className="sticky bottom-3 z-10 -mx-4 mt-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:static lg:m-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60 lg:w-auto"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </div>

      {/* ── Preview column (desktop only) ───────────────────────────── */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 rounded-2xl border border-border bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4 text-primary" /> Preview
          </div>
          <PreviewSnapshot doc={doc} />
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/profile/resume/print?template=ats"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs font-medium hover:bg-card"
            >
              <FileText className="h-3.5 w-3.5" /> ATS
            </a>
            <a
              href="/profile/resume/print?template=modern"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs font-medium hover:bg-card"
            >
              <FileText className="h-3.5 w-3.5" /> Modern
            </a>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Preview reflects the LAST SAVED version. Save first, then open a template.
          </p>
        </div>
      </aside>
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────

function Toolbar({
  pending, flash, derivedFrom, onSave, onImportClick,
}: {
  pending: boolean;
  flash: { kind: "ok" | "err"; text: string } | null;
  derivedFrom: DerivedFrom;
  onSave: () => void;
  onImportClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/40 p-3">
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Save className="h-3.5 w-3.5" />}
        Save
      </button>
      <button
        type="button"
        onClick={onImportClick}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium hover:bg-card"
      >
        <Upload className="h-3.5 w-3.5" /> Import JSON
      </button>
      <a
        href="/api/resume/export"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium hover:bg-card"
        download
      >
        <Download className="h-3.5 w-3.5" /> Export JSON
      </a>
      <a
        href="/profile/resume/print?template=ats&autoprint=1"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium hover:bg-card"
      >
        <Eye className="h-3.5 w-3.5" /> Print PDF
      </a>
      <span className="ml-auto text-[10px] text-muted-foreground">
        {derivedFrom === "json" ? "Editing saved JSON Resume" :
         derivedFrom === "parsed" ? "Derived from PDF parse — review & save" :
         "New resume"}
      </span>
      {flash && (
        <div className={`mt-2 flex w-full items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
          flash.kind === "ok"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-rose-500/30 bg-rose-500/10 text-rose-300"
        }`}>
          {flash.kind === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {flash.text}
        </div>
      )}
    </div>
  );
}

// ── Accordion ──────────────────────────────────────────────────────────────

function Accordion({
  label, subtitle, isOpen, onToggle, children,
}: {
  section: Section;
  label: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-card/60"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="border-t border-border/50 px-4 py-4 space-y-3">{children}</div>
      )}
    </section>
  );
}

// ── Reusable inputs ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const textareaCls = `${inputCls} min-h-[80px]`;

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${textareaCls} ${props.className ?? ""}`} />;
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-300 hover:bg-rose-500/20"
    >
      <Trash2 className="h-3 w-3" /> Remove
    </button>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-card/30 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
    >
      <Plus className="h-3 w-3" /> {label}
    </button>
  );
}

// ── Section forms ──────────────────────────────────────────────────────────

type SetDoc = React.Dispatch<React.SetStateAction<JsonResume>>;

function BasicsForm({ doc, setDoc }: { doc: JsonResume; setDoc: SetDoc }) {
  const b = doc.basics;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <TextInput value={b.name} onChange={(e) => setDoc({ ...doc, basics: { ...b, name: e.target.value } })} />
        </Field>
        <Field label="Headline / role">
          <TextInput value={b.label ?? ""} onChange={(e) => setDoc({ ...doc, basics: { ...b, label: e.target.value } })} />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={b.email ?? ""} onChange={(e) => setDoc({ ...doc, basics: { ...b, email: e.target.value } })} />
        </Field>
        <Field label="Phone">
          <TextInput value={b.phone ?? ""} onChange={(e) => setDoc({ ...doc, basics: { ...b, phone: e.target.value } })} />
        </Field>
        <Field label="Website / portfolio URL">
          <TextInput type="url" value={b.url ?? ""} onChange={(e) => setDoc({ ...doc, basics: { ...b, url: e.target.value } })} />
        </Field>
        <Field label="City">
          <TextInput value={b.location?.city ?? ""} onChange={(e) => setDoc({ ...doc, basics: { ...b, location: { ...(b.location ?? {}), city: e.target.value, countryCode: "IN" } } })} />
        </Field>
      </div>
      <Field label="Professional summary">
        <TextArea value={b.summary ?? ""} onChange={(e) => setDoc({ ...doc, basics: { ...b, summary: e.target.value } })} />
      </Field>
    </>
  );
}

function WorkForm({ doc, setDoc }: { doc: JsonResume; setDoc: SetDoc }) {
  const setItem = (idx: number, next: Partial<JsonResumeWork>) => {
    setDoc({ ...doc, work: doc.work.map((w, i) => (i === idx ? { ...w, ...next } : w)) });
  };
  const remove = (idx: number) => setDoc({ ...doc, work: doc.work.filter((_, i) => i !== idx) });
  const add = () =>
    setDoc({
      ...doc,
      work: [
        ...doc.work,
        { name: "", position: "", startDate: undefined, endDate: undefined, summary: "", highlights: [] },
      ],
    });

  return (
    <>
      {doc.work.length === 0 && (
        <p className="text-xs text-muted-foreground">No work history yet — add your first role.</p>
      )}
      {doc.work.map((w, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Company"><TextInput value={w.name} onChange={(e) => setItem(i, { name: e.target.value })} /></Field>
            <Field label="Role"><TextInput value={w.position} onChange={(e) => setItem(i, { position: e.target.value })} /></Field>
            <Field label="Start (YYYY or YYYY-MM)"><TextInput value={w.startDate ?? ""} onChange={(e) => setItem(i, { startDate: e.target.value || undefined })} /></Field>
            <Field label="End (YYYY, YYYY-MM, or Present)"><TextInput value={w.endDate ?? ""} onChange={(e) => setItem(i, { endDate: e.target.value || undefined })} /></Field>
          </div>
          <Field label="Summary">
            <TextArea value={w.summary ?? ""} onChange={(e) => setItem(i, { summary: e.target.value })} />
          </Field>
          <Field label="Highlights (one per line)">
            <TextArea
              value={w.highlights.join("\n")}
              onChange={(e) => setItem(i, { highlights: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
          <div className="flex justify-end"><RemoveButton onClick={() => remove(i)} /></div>
        </div>
      ))}
      <AddButton label="Add role" onClick={add} />
    </>
  );
}

function EducationForm({ doc, setDoc }: { doc: JsonResume; setDoc: SetDoc }) {
  const setItem = (idx: number, next: Partial<JsonResumeEducation>) => {
    setDoc({ ...doc, education: doc.education.map((e, i) => (i === idx ? { ...e, ...next } : e)) });
  };
  const remove = (idx: number) => setDoc({ ...doc, education: doc.education.filter((_, i) => i !== idx) });
  const add = () =>
    setDoc({
      ...doc,
      education: [...doc.education, { institution: "", area: "", studyType: "", courses: [] }],
    });
  return (
    <>
      {doc.education.length === 0 && (
        <p className="text-xs text-muted-foreground">Add your degrees.</p>
      )}
      {doc.education.map((e, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Institution"><TextInput value={e.institution} onChange={(ev) => setItem(i, { institution: ev.target.value })} /></Field>
            <Field label="Degree (studyType)"><TextInput value={e.studyType ?? ""} onChange={(ev) => setItem(i, { studyType: ev.target.value })} /></Field>
            <Field label="Field of study"><TextInput value={e.area ?? ""} onChange={(ev) => setItem(i, { area: ev.target.value })} /></Field>
            <Field label="End year"><TextInput value={e.endDate ?? ""} onChange={(ev) => setItem(i, { endDate: ev.target.value || undefined })} /></Field>
          </div>
          <div className="flex justify-end"><RemoveButton onClick={() => remove(i)} /></div>
        </div>
      ))}
      <AddButton label="Add degree" onClick={add} />
    </>
  );
}

function SkillsForm({ doc, setDoc }: { doc: JsonResume; setDoc: SetDoc }) {
  const setItem = (idx: number, next: Partial<JsonResumeSkill>) => {
    setDoc({ ...doc, skills: doc.skills.map((s, i) => (i === idx ? { ...s, ...next } : s)) });
  };
  const remove = (idx: number) => setDoc({ ...doc, skills: doc.skills.filter((_, i) => i !== idx) });
  const add = () => setDoc({ ...doc, skills: [...doc.skills, { name: "", keywords: [] }] });
  return (
    <>
      {doc.skills.length === 0 && (
        <p className="text-xs text-muted-foreground">Group your skills — e.g. Backend, Frontend, Tools.</p>
      )}
      {doc.skills.map((s, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr]">
            <Field label="Group"><TextInput value={s.name} onChange={(e) => setItem(i, { name: e.target.value })} /></Field>
            <Field label="Keywords (comma-separated)">
              <TextInput
                value={s.keywords.join(", ")}
                onChange={(e) => setItem(i, { keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
              />
            </Field>
          </div>
          <div className="flex justify-end"><RemoveButton onClick={() => remove(i)} /></div>
        </div>
      ))}
      <AddButton label="Add skill group" onClick={add} />
    </>
  );
}

function ProjectsForm({ doc, setDoc }: { doc: JsonResume; setDoc: SetDoc }) {
  const setItem = (idx: number, next: Partial<JsonResumeProject>) => {
    setDoc({ ...doc, projects: doc.projects.map((p, i) => (i === idx ? { ...p, ...next } : p)) });
  };
  const remove = (idx: number) => setDoc({ ...doc, projects: doc.projects.filter((_, i) => i !== idx) });
  const add = () =>
    setDoc({ ...doc, projects: [...doc.projects, { name: "", description: "", highlights: [], keywords: [], roles: [] }] });

  return (
    <>
      {doc.projects.length === 0 && (
        <p className="text-xs text-muted-foreground">Add products / open-source projects you built.</p>
      )}
      {doc.projects.map((p, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Project name"><TextInput value={p.name} onChange={(e) => setItem(i, { name: e.target.value })} /></Field>
            <Field label="URL"><TextInput type="url" value={p.url ?? ""} onChange={(e) => setItem(i, { url: e.target.value || undefined })} /></Field>
          </div>
          <Field label="Description">
            <TextArea value={p.description ?? ""} onChange={(e) => setItem(i, { description: e.target.value })} />
          </Field>
          <Field label="Highlights (one per line)">
            <TextArea
              value={p.highlights.join("\n")}
              onChange={(e) => setItem(i, { highlights: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
          <Field label="Tech / keywords (comma-separated)">
            <TextInput
              value={p.keywords.join(", ")}
              onChange={(e) => setItem(i, { keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
            />
          </Field>
          <div className="flex justify-end"><RemoveButton onClick={() => remove(i)} /></div>
        </div>
      ))}
      <AddButton label="Add project" onClick={add} />
    </>
  );
}

function CertificatesForm({ doc, setDoc }: { doc: JsonResume; setDoc: SetDoc }) {
  const setItem = (idx: number, next: Partial<JsonResumeCertificate>) => {
    setDoc({ ...doc, certificates: doc.certificates.map((c, i) => (i === idx ? { ...c, ...next } : c)) });
  };
  const remove = (idx: number) => setDoc({ ...doc, certificates: doc.certificates.filter((_, i) => i !== idx) });
  const add = () => setDoc({ ...doc, certificates: [...doc.certificates, { name: "" }] });
  return (
    <>
      {doc.certificates.length === 0 && (
        <p className="text-xs text-muted-foreground">Add AWS, GCP, security, ML, etc.</p>
      )}
      {doc.certificates.map((c, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label="Name"><TextInput value={c.name} onChange={(e) => setItem(i, { name: e.target.value })} /></Field>
            <Field label="Issuer"><TextInput value={c.issuer ?? ""} onChange={(e) => setItem(i, { issuer: e.target.value })} /></Field>
            <Field label="Date (YYYY-MM)"><TextInput value={c.date ?? ""} onChange={(e) => setItem(i, { date: e.target.value || undefined })} /></Field>
          </div>
          <div className="flex justify-end"><RemoveButton onClick={() => remove(i)} /></div>
        </div>
      ))}
      <AddButton label="Add certification" onClick={add} />
    </>
  );
}

function LanguagesForm({ doc, setDoc }: { doc: JsonResume; setDoc: SetDoc }) {
  const setItem = (idx: number, next: Partial<JsonResumeLanguage>) => {
    setDoc({ ...doc, languages: doc.languages.map((l, i) => (i === idx ? { ...l, ...next } : l)) });
  };
  const remove = (idx: number) => setDoc({ ...doc, languages: doc.languages.filter((_, i) => i !== idx) });
  const add = () => setDoc({ ...doc, languages: [...doc.languages, { language: "" }] });
  return (
    <>
      {doc.languages.length === 0 && (
        <p className="text-xs text-muted-foreground">Add spoken / written languages.</p>
      )}
      {doc.languages.map((l, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-border/50 bg-background/40 p-3">
          <Field label="Language"><TextInput value={l.language} onChange={(e) => setItem(i, { language: e.target.value })} /></Field>
          <Field label="Fluency"><TextInput value={l.fluency ?? ""} onChange={(e) => setItem(i, { fluency: e.target.value || undefined })} /></Field>
          <div className="ml-auto"><RemoveButton onClick={() => remove(i)} /></div>
        </div>
      ))}
      <AddButton label="Add language" onClick={add} />
    </>
  );
}

// ── Preview snapshot (live, not full PDF — just a summary) ─────────────────

function PreviewSnapshot({ doc }: { doc: JsonResume }) {
  const b = doc.basics;
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-4 text-xs leading-relaxed">
      <p className="text-base font-semibold text-foreground">{b.name || <span className="text-muted-foreground">(name)</span>}</p>
      {b.label && <p className="text-muted-foreground">{b.label}</p>}
      {b.location?.city && <p className="text-muted-foreground">{b.location.city}</p>}
      {b.summary && <p className="mt-2 line-clamp-3 text-muted-foreground">{b.summary}</p>}
      <div className="mt-3 grid grid-cols-2 gap-1">
        <Stat label="Work" value={doc.work.length} />
        <Stat label="Edu" value={doc.education.length} />
        <Stat label="Skills" value={doc.skills.length} />
        <Stat label="Projects" value={doc.projects.length} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/40 bg-card/40 px-2 py-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
