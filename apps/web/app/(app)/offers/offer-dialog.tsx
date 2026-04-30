"use client";

import { useState, useId } from "react";
import { Plus, X, Pencil, Loader2 } from "lucide-react";
import { upsertOffer } from "./actions";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type Company = { id: string; name: string };

type Offer = {
  id: string;
  company_id: string;
  base_lpa: number | null;
  variable_lpa: number | null;
  esop_value_lpa: number | null;
  joining_bonus: number | null;
  notes: string | null;
};

function OfferForm({
  companies,
  offer,
  onClose,
}: {
  companies: Company[];
  offer?: Offer;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const titleId = useId();

  useEscapeKey(onClose);
  const trapRef = useFocusTrap(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    await upsertOffer(fd);
    setPending(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={trapRef}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id={titleId} className="font-semibold">
            {offer ? "Edit offer" : "Add offer"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {offer && <input type="hidden" name="id" value={offer.id} />}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Company *
            </label>
            <select
              name="company_id"
              required
              defaultValue={offer?.company_id ?? ""}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LpaField name="base_lpa" label="Base LPA" defaultValue={offer?.base_lpa} />
            <LpaField name="variable_lpa" label="Variable LPA" defaultValue={offer?.variable_lpa} />
            <LpaField name="esop_value_lpa" label="ESOP / yr (LPA equiv)" defaultValue={offer?.esop_value_lpa} />
            <LpaField name="joining_bonus" label="Joining bonus (₹L)" defaultValue={offer?.joining_bonus} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={offer?.notes ?? ""}
              placeholder="Vesting cliff, role level, expiry date…"
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {offer ? "Save changes" : "Add offer"}
          </button>
        </form>
      </div>
    </div>
  );
}

function LpaField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="number"
        name={name}
        step="0.5"
        min="0"
        defaultValue={defaultValue ?? ""}
        placeholder="0"
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

export function AddOfferButton({ companies }: { companies: Company[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Add offer
      </button>
      {open && <OfferForm companies={companies} onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditOfferButton({
  offer,
  companies,
}: {
  offer: Offer;
  companies: Company[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Edit offer`}
        aria-haspopup="dialog"
        className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <OfferForm
          offer={offer}
          companies={companies}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
