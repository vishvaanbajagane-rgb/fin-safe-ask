import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Activity } from "lucide-react";
import { SiteHeader } from "@/components/finsafe/SiteHeader";
import { finsafe, useFinSafe } from "@/lib/finsafe/store";
import { analyzeMedia, analyzeRequest } from "@/lib/finsafe/engine";
import { persistAnalysis } from "@/lib/finsafe/persist";
import { statusLabel } from "@/lib/finsafe/format";
import { useAuth } from "@/hooks/useAuth";
import type { EnrichedResult, MediaAnalysisRow } from "@/lib/finsafe/types";

export const Route = createFileRoute("/processing")({
  head: () => ({
    meta: [
      { title: "Analysing your data — FinSafe AI" },
      {
        name: "description",
        content: "Live progress while FinSafe AI scores every purchase request you uploaded.",
      },
      { property: "og:title", content: "Analysing your data — FinSafe AI" },
      { property: "og:description", content: "Live progress of your affordability analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProcessingPage,
});

function ProcessingPage() {
  const state = useFinSafe();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const started = useRef(false);
  const cancelled = useRef(false);
  const logEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.logs.length]);

  useEffect(() => {
    if (started.current) return;
    const snapshot = finsafe.get();
    if (!snapshot.requests.length) {
      navigate({ to: "/upload", replace: true });
      return;
    }
    started.current = true;
    cancelled.current = false;

    const requests = snapshot.requests;
    const usersMap = new Map(snapshot.users.map((u) => [u.user_id, u]));
    const transactions = snapshot.transactions;
    const config = snapshot.config;
    const media = snapshot.media;

    finsafe.set({ running: true, progress: 0, startedAt: Date.now(), results: [], logs: [] });
    finsafe.log(`✅ Loaded requests — ${requests.length} requests found`);
    if (snapshot.users.length) finsafe.log(`✅ Loaded people — ${snapshot.users.length} profiles`);
    if (transactions.length)
      finsafe.log(`✅ Loaded transactions — ${transactions.length} records`);

    const results: EnrichedResult[] = [];
    const mediaRows: MediaAnalysisRow[] = [];
    let index = 0;
    let llmCalls = 0;
    let vlmCalls = 0;

    function step() {
      if (cancelled.current) return;
      const batch = Math.max(1, Math.ceil(requests.length / 60));
      for (let n = 0; n < batch && index < requests.length; n++, index++) {
        const request = requests[index]!;
        finsafe.log(`🔍 Analyzing ${request.request_id}...`);

        let boost = 0;
        if (config.useVlm && media.length && index < media.length) {
          const rows = analyzeMedia([media[index]!], request.request_id);
          mediaRows.push(...rows);
          vlmCalls += rows.length;
          boost = 0;
          finsafe.log(`📸 Extracting text from ${media[index]!.filename}...`);
        }

        const result = analyzeRequest(request, usersMap, transactions, config, boost);
        if (config.useLlm) llmCalls++;
        results.push(result);
        finsafe.log(
          `✅ ${request.request_id} complete → ${statusLabel(result.affordability_status)}`,
        );
      }

      const elapsed = Date.now() - (finsafe.get().startedAt ?? Date.now());
      finsafe.set({
        progress: Math.round((index / requests.length) * 100),
        results: [...results],
        mediaAnalysis: [...mediaRows],
        stats: {
          llmCalls,
          vlmCalls,
          avgMs: index ? Math.round(elapsed / index) : 0,
          errors: 0,
        },
      });

      if (index < requests.length) {
        window.setTimeout(step, 40);
      } else {
        finsafe.log("🧾 Analysis complete — results ready to download");
        finsafe.set({ running: false, progress: 100 });
        void finish();
      }
    }

    async function finish() {
      const owner = userRef.current;
      if (owner) {
        try {
          await persistAnalysis({
            ownerId: owner.id,
            requests,
            users: snapshot.users,
            transactions,
            results,
            media: mediaRows,
            logs: finsafe.get().logs,
          });
        } catch {
          finsafe.log("⚠️ Results kept in this session only — saving to your account failed");
        }
      }
      if (!cancelled.current) navigate({ to: "/results" });
    }

    window.setTimeout(step, 200);

    return () => {
      cancelled.current = true;
    };
  }, [navigate]);

  const total = state.requests.length;
  const done = state.results.length;
  const remaining = Math.max(0, total - done);
  const eta = state.stats.avgMs ? Math.round((remaining * state.stats.avgMs) / 1000) : 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1000px] px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full border border-border">
            <Activity className="h-5 w-5 text-primary" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold">
            Analyzing Your Financial Data...
          </h1>
          <p className="num mt-2 text-sm text-muted-foreground">{state.progress}% complete</p>
          <div className="mt-4 h-1 w-full max-w-xl overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-150 ease-out"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Requests processed" value={`${done} / ${total}`} />
          <Stat label="Images analysed" value={`${state.mediaAnalysis.length} / ${state.media.length}`} />
          <Stat
            label="Average time per request"
            value={`${(state.stats.avgMs / 1000).toFixed(2)}s`}
          />
          <Stat
            label="Estimated time remaining"
            value={eta > 60 ? `${Math.floor(eta / 60)}m ${eta % 60}s` : `${eta}s`}
          />
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-border">
          <div className="h-80 overflow-y-auto bg-[var(--terminal)] p-4 font-mono text-xs leading-relaxed text-[var(--terminal-foreground)]">
            {state.logs.map((l, i) => (
              <p key={i} className="animate-in fade-in duration-150">
                [{l.time}] {l.text}
              </p>
            ))}
            <div ref={logEnd} />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              cancelled.current = true;
              finsafe.set({ running: false });
              navigate({ to: "/upload" });
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel analysis
          </button>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="paper-card p-4">
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="num mt-2 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}
