import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search, Upload as UploadIcon } from "lucide-react";
import { SiteHeader } from "@/components/finsafe/SiteHeader";
import { StatusBadge } from "@/components/finsafe/StatusBadge";
import { useResults } from "@/lib/finsafe/useResults";
import { inr, statusLabel } from "@/lib/finsafe/format";
import {
  downloadCsv,
  downloadExcel,
  downloadJson,
  downloadPdf,
} from "@/lib/finsafe/exporters";

export const Route = createFileRoute("/results/")({
  head: () => ({
    meta: [
      { title: "Affordability Results — FinSafe AI" },
      {
        name: "description",
        content:
          "Every purchase request scored: how much is safe to pay now, the suggested payment plan and downloadable results in CSV, Excel, JSON or PDF.",
      },
      { property: "og:title", content: "Affordability Results — FinSafe AI" },
      {
        property: "og:description",
        content: "Review scored purchase requests and download the results in any format.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultsPage,
});

const statuses = [
  "all",
  "affordable_now",
  "affordable_with_plan",
  "affordable_later",
  "not_affordable",
] as const;

function ResultsPage() {
  const { results, loading } = useResults();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return results.filter((r) => {
      if (status !== "all" && r.affordability_status !== status) return false;
      if (!q) return true;
      return (
        r.request_id.toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q) ||
        r.item_description.toLowerCase().includes(q)
      );
    });
  }, [results, query, status]);

  const summary = useMemo(() => {
    const total = results.length;
    const safe = results.reduce((s, r) => s + (Number(r.amount_safe_to_pay) || 0), 0);
    const requested = results.reduce((s, r) => s + r.amount_requested, 0);
    const affordable = results.filter((r) =>
      r.affordability_status.startsWith("affordable"),
    ).length;
    return { total, safe, requested, affordable };
  }, [results]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-muted-foreground">Results</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
              Affordability decisions
            </h1>
          </div>

          {results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => downloadCsv(results)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download CSV
              </button>
              <button
                onClick={() => downloadExcel(results)}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Excel
              </button>
              <button
                onClick={() => downloadJson(results)}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                JSON
              </button>
              <button
                onClick={() => downloadPdf(results)}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                PDF
              </button>
            </div>
          )}
        </div>

        {loading && results.length === 0 ? (
          <p className="mt-16 text-sm text-muted-foreground">Loading your saved results…</p>
        ) : results.length === 0 ? (
          <div className="paper-card mt-10 p-10 text-center">
            <h2 className="font-display text-xl font-semibold">No results yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Upload your requests file and run the analysis to see how much of each purchase you
              can safely afford.
            </p>
            <Link
              to="/upload"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <UploadIcon className="h-4 w-4" /> Upload data
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Requests scored" value={String(summary.total)} />
              <SummaryCard label="Affordable in some form" value={String(summary.affordable)} />
              <SummaryCard label="Total requested" value={inr(summary.requested)} />
              <SummaryCard label="Total safe to pay now" value={inr(summary.safe)} />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search request, person or item"
                  className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {statuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`label-caps rounded-sm border px-2.5 py-[6px] ${
                      status === s
                        ? "border-primary bg-primary/8 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {s === "all" ? "All" : statusLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            <div className="paper-card mt-5 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "Request",
                      "Person",
                      "Item",
                      "Requested",
                      "Safe to pay",
                      "Status",
                      "Method",
                      "",
                    ].map((h) => (
                      <th key={h} className="label-caps px-4 py-3 text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.request_id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{r.request_id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.user_id}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3">{r.item_description}</td>
                      <td className="num px-4 py-3">{inr(r.amount_requested)}</td>
                      <td className="num px-4 py-3 font-semibold">
                        {inr(Number(r.amount_safe_to_pay) || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.affordability_status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.recommended_payment_method || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/results/$requestId"
                          params={{ requestId: r.request_id }}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Nothing matches that filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="paper-card p-5">
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="num mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
