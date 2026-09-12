import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SiteHeader } from "@/components/finsafe/SiteHeader";
import { useResults } from "@/lib/finsafe/useResults";
import { inr, statusLabel } from "@/lib/finsafe/format";
import { downloadCsv } from "@/lib/finsafe/exporters";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Insights & Admin — FinSafe AI" },
      {
        name: "description",
        content:
          "Aggregate view of every scored request: status mix, approval rate, safe-to-pay totals and the people with the most requests.",
      },
      { property: "og:title", content: "Insights & Admin — FinSafe AI" },
      {
        property: "og:description",
        content: "Portfolio-level affordability insights across all scored requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const statusColors: Record<string, string> = {
  affordable_now: "var(--success)",
  affordable_with_plan: "var(--secondary)",
  affordable_later: "var(--warning)",
  not_affordable: "var(--destructive)",
};

function AdminPage() {
  const { results, loading } = useResults();

  const data = useMemo(() => {
    const byStatus = new Map<string, number>();
    const byUser = new Map<string, { requests: number; requested: number; safe: number }>();
    let requested = 0;
    let safe = 0;

    for (const r of results) {
      byStatus.set(r.affordability_status, (byStatus.get(r.affordability_status) ?? 0) + 1);
      const u = byUser.get(r.user_id) ?? { requests: 0, requested: 0, safe: 0 };
      u.requests += 1;
      u.requested += r.amount_requested;
      u.safe += Number(r.amount_safe_to_pay) || 0;
      byUser.set(r.user_id, u);
      requested += r.amount_requested;
      safe += Number(r.amount_safe_to_pay) || 0;
    }

    const statusData = [...byStatus.entries()].map(([status, count]) => ({
      status,
      label: statusLabel(status),
      count,
    }));

    const userData = [...byUser.entries()]
      .map(([user_id, v]) => ({ user_id, ...v }))
      .sort((a, b) => b.requested - a.requested)
      .slice(0, 8);

    const approved = results.filter((r) => r.affordability_status.startsWith("affordable")).length;

    return {
      statusData,
      userData,
      requested,
      safe,
      approvalRate: results.length ? Math.round((approved / results.length) * 100) : 0,
      avgRequest: results.length ? requested / results.length : 0,
    };
  }, [results]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-muted-foreground">Insights</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
              Portfolio overview
            </h1>
          </div>
          {results.length > 0 && (
            <button
              onClick={() => downloadCsv(results, "finsafe-all-results.csv")}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Export all results
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="paper-card mt-10 p-10 text-center">
            <h2 className="font-display text-xl font-semibold">
              {loading ? "Loading…" : "Nothing to report yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Run an analysis first and this page will summarise every decision.
            </p>
            <Link
              to="/upload"
              className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Upload data
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Requests scored" value={String(results.length)} />
              <Kpi label="Approval rate" value={`${data.approvalRate}%`} />
              <Kpi label="Average request" value={inr(data.avgRequest)} />
              <Kpi label="Safe to pay (total)" value={inr(data.safe)} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="paper-card p-6">
                <h2 className="font-display text-lg font-semibold">Decision mix</h2>
                <div className="mt-4 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusData}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                      >
                        {data.statusData.map((d) => (
                          <Cell
                            key={d.status}
                            fill={statusColors[d.status] ?? "var(--muted-foreground)"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-3 flex flex-wrap gap-4">
                  {data.statusData.map((d) => (
                    <li key={d.status} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: statusColors[d.status] ?? "var(--muted-foreground)" }}
                      />
                      {d.label} · {d.count}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="paper-card p-6">
                <h2 className="font-display text-lg font-semibold">Requested vs safe to pay</h2>
                <div className="mt-4 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.userData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="user_id" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => inr(v)} />
                      <Bar dataKey="requested" fill="var(--muted-foreground)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="safe" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            <section className="paper-card mt-6 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Person", "Requests", "Total requested", "Total safe to pay", "Coverage"].map(
                      (h) => (
                        <th key={h} className="label-caps px-4 py-3 text-muted-foreground">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.userData.map((u) => (
                    <tr key={u.user_id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{u.user_id}</td>
                      <td className="num px-4 py-3">{u.requests}</td>
                      <td className="num px-4 py-3">{inr(u.requested)}</td>
                      <td className="num px-4 py-3 font-semibold">{inr(u.safe)}</td>
                      <td className="num px-4 py-3">
                        {u.requested ? Math.round((u.safe / u.requested) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="paper-card p-5">
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="num mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
