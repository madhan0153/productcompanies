import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trash2, GitCompare } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { AddOfferButton, EditOfferButton } from "./offer-dialog";
import { deleteOffer } from "./actions";

export const metadata: Metadata = { title: "Offer Compare" };

type Offer = {
  id: string;
  company_id: string;
  base_lpa: number | null;
  variable_lpa: number | null;
  esop_value_lpa: number | null;
  joining_bonus: number | null;
  notes: string | null;
  created_at: string;
};

type Company = { id: string; name: string; slug: string; logo_url: string | null };

function total(o: Offer): number {
  return (o.base_lpa ?? 0) + (o.variable_lpa ?? 0) + (o.esop_value_lpa ?? 0);
}

export default async function OffersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: rawOffers }, { data: rawCompanies }] = await Promise.all([
    supabase.from("offers")
      .select("id, company_id, base_lpa, variable_lpa, esop_value_lpa, joining_bonus, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("companies")
      .select("id, name, slug, logo_url")
      .order("name"),
  ]);

  const offers = (rawOffers ?? []) as Offer[];
  const companies = (rawCompanies ?? []) as Company[];
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  const maxTotal = Math.max(...offers.map(total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Offer Compare</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {offers.length > 0
              ? `Comparing ${offers.length} offer${offers.length !== 1 ? "s" : ""} · all amounts in LPA`
              : "Add your offers to compare them side-by-side"}
          </p>
        </div>
        <AddOfferButton companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
      </div>

      {offers.length > 0 ? (
        <>
          {/* Bar comparison */}
          <div className="rounded-2xl border border-border bg-card/40 p-6">
            <h2 className="mb-5 text-sm font-medium text-muted-foreground">Total compensation (LPA)</h2>
            <div className="space-y-4">
              {[...offers].sort((a, b) => total(b) - total(a)).map((offer) => {
                const co = companyMap.get(offer.company_id);
                const t = total(offer);
                const pct = (t / maxTotal) * 100;
                return (
                  <div key={offer.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{co?.name ?? "—"}</span>
                      <span className="tabular-nums text-primary font-semibold">{t.toFixed(1)} LPA</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-3 text-left font-medium">Company</th>
                  <th className="px-4 py-3 text-right font-medium">Base</th>
                  <th className="px-4 py-3 text-right font-medium">Variable</th>
                  <th className="px-4 py-3 text-right font-medium">ESOP / yr</th>
                  <th className="px-4 py-3 text-right font-medium">Total CTC</th>
                  <th className="px-4 py-3 text-right font-medium">Joining ₹L</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {[...offers].sort((a, b) => total(b) - total(a)).map((offer, idx) => {
                  const co = companyMap.get(offer.company_id);
                  const t = total(offer);
                  const isTop = idx === 0;
                  return (
                    <tr
                      key={offer.id}
                      className={`border-b border-border last:border-0 transition hover:bg-secondary/30 ${isTop ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {isTop && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Best</span>
                          )}
                          <span className="font-medium">{co?.name ?? "—"}</span>
                        </div>
                        {offer.notes && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground max-w-[180px]">{offer.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {offer.base_lpa != null ? `${offer.base_lpa}` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                        {offer.variable_lpa != null ? `${offer.variable_lpa}` : <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                        {offer.esop_value_lpa != null ? `${offer.esop_value_lpa}` : <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-primary">
                        {t.toFixed(1)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                        {offer.joining_bonus != null ? `${offer.joining_bonus}L` : <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1">
                          <EditOfferButton
                            offer={offer}
                            companies={companies.map((c) => ({ id: c.id, name: c.name }))}
                          />
                          <form action={deleteOffer}>
                            <input type="hidden" name="id" value={offer.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-transparent p-1.5 text-muted-foreground transition hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Key insight */}
          {offers.length >= 2 && (() => {
            const sorted = [...offers].sort((a, b) => total(b) - total(a));
            const best = sorted[0];
            const second = sorted[1];
            const diff = total(best) - total(second);
            const bestCo = companyMap.get(best.company_id)?.name ?? "Top offer";
            return (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
                <span className="font-medium text-primary">{bestCo}</span>
                {" "}leads by{" "}
                <span className="font-medium">{diff.toFixed(1)} LPA</span>
                {" "}in total CTC.
                {best.joining_bonus != null && (
                  <span className="text-muted-foreground"> Plus a ₹{best.joining_bonus}L joining bonus.</span>
                )}
              </div>
            );
          })()}
        </>
      ) : (
        <EmptyState
          icon={<GitCompare className="h-5 w-5" />}
          title="Compare your offers side-by-side"
          body="Add base, variable, ESOP, and joining bonus to see total CTC at a glance — and which offer truly leads."
        />
      )}
    </div>
  );
}
