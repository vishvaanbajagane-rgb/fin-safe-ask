import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { SiteHeader } from "@/components/finsafe/SiteHeader";
import { StatusBadge } from "@/components/finsafe/StatusBadge";
import { useResults } from "@/lib/finsafe/useResults";
import { inr } from "@/lib/finsafe/format";
import { downloadCsv, downloadJson, downloadPdf } from "@/lib/finsafe/exporters";

export const Route = createFileRoute("/results/$requestId")({
  head: () => ({
    meta: [
      { title: "Request breakdown — FinSafe AI" },
      {
        name: "description",
        content:
          "Full affordability breakdown for one purchase request: safe amount, payment plan, spending changes and the reasoning behind the decision.",
      },
      { property: "og:title", content: "Request breakdown — FinSafe AI" },
      {
        property: "og:description",
        content: "See exactly why FinSafe AI reached this affordability decision.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestDetail,
});

function RequestDetail() {
  const { requestId } = Route.useParams();
  const { results, loading } = useResults();
  const result = results.find((r) => r.request_id === requestId);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <Link
          to="/results"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All results
        </Link>

        {!result ? (
          <p className="mt-16 text-sm text-muted-foreground">
            {loading ? "Loading…" : `No result found for ${requestId}.`}
          </p>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{result.request_id}</p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
                  {result.item_description || "Purchase request"}
                </h1>
                <div className="mt-3 flex items-center gap-3">
                  <StatusBadge status={result.affordability_status} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {result.user_id}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadCsv([result], `${result.request_id}.csv`)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <Download className="h-4 w-4" /> CSV
                </button>
                <button
                  onClick={() => downloadJson([result])}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  JSON
                </button>
                <button
                  onClick={() => downloadPdf([result])}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  PDF
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Stat label="Amount requested" value={inr(result.amount_requested)} />
              <Stat
                label="Safe to pay now"
                value={inr(Number(result.amount_safe_to_pay) || 0)}
                emphasis
              />
              <Stat
                label="Earliest full payment"
                value={result.earliest_date_for_full_payment || "—"}
              />
            </div>

            <section className="paper-card mt-6 p-6">
              <h2 className="font-display text-lg font-semibold">Why this decision</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {result.decision_explanation || "No explanation recorded."}
              </p>
              <p className="mt-4 text-sm">
                <span className="label-caps text-muted-foreground">Recommended method</span>
                <br />
                {result.recommended_payment_method || "—"}
              </p>
            </section>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <section className="paper-card p-6">
                <h2 className="font-display text-lg font-semibold">Payment plan</h2>
                {result.installments.length ? (
                  <ul className="mt-4 space-y-2">
                    {result.installments.map((i, idx) => (
                      <li
                        key={`${i.date}-${idx}`}
                        className="flex items-center justify-between border-b border-border/60 pb-2 text-sm last:border-0"
                      >
                        <span className="font-mono text-xs text-muted-foreground">{i.date}</span>
                        <span className="num font-medium">{inr(i.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {result.payment_plan || "No instalments needed."}
                  </p>
                )}
              </section>

              <section className="paper-card p-6">
                <h2 className="font-display text-lg font-semibold">Spending changes needed</h2>
                {result.spending_changes.length ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {result.spending_changes.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {result.spending_changes_needed || "None — no changes required."}
                  </p>
                )}
              </section>
            </div>

            <section className="paper-card mt-6 p-6">
              <h2 className="font-display text-lg font-semibold">Financial snapshot</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <Mini label="Balance" value={inr(result.snapshot.balance)} />
                <Mini label="Monthly income" value={inr(result.snapshot.monthly_income)} />
                <Mini label="Essentials" value={inr(result.snapshot.monthly_essentials)} />
                <Mini label="Min balance kept" value={inr(result.snapshot.preferred_min_balance)} />
                <Mini label="Pending payments" value={inr(result.snapshot.pending_payments)} />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`paper-card p-5 ${emphasis ? "border-primary/40" : ""}`}>
      <p className="label-caps text-muted-foreground">{label}</p>
      <p
        className={`num mt-2 font-display text-2xl font-bold ${emphasis ? "text-primary" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="num mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
