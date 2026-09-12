import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Archive, CheckCircle2, FileText, ImageIcon, X } from "lucide-react";
import { SiteHeader } from "@/components/finsafe/SiteHeader";
import {
  parseCsv,
  toExchangeRates,
  toImages,
  toMessages,
  toPaymentOptions,
  toRequests,
  toTransactions,
  toUsers,
} from "@/lib/finsafe/csv";
import { finsafe, useFinSafe, type FileKind, type FileMeta } from "@/lib/finsafe/store";
import type { MediaFileMeta } from "@/lib/finsafe/types";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload your financial data — FinSafe AI" },
      {
        name: "description",
        content:
          "Upload requests, financial profiles, events, exchange rates, payment options, messages and receipts, then configure how FinSafe AI should analyse them.",
      },
      { property: "og:title", content: "Upload your financial data — FinSafe AI" },
      {
        property: "og:description",
        content: "Add your files and start an affordability analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

type Kind = FileKind;

const zones: { kind: Kind; label: string; required: boolean; hint: string }[] = [
  { kind: "requests", label: "requests.csv", required: true, hint: "What people want to buy" },
  {
    kind: "users",
    label: "financial_profiles.csv",
    required: true,
    hint: "Balance, income, essentials, currency",
  },
  {
    kind: "transactions",
    label: "financial_events.csv",
    required: true,
    hint: "Completed and pending money movements",
  },
  {
    kind: "rates",
    label: "exchange_rates.csv",
    required: true,
    hint: "Converts every amount to INR",
  },
  {
    kind: "paymentOptions",
    label: "request_payment_options.csv",
    required: true,
    hint: "Whether part payment is allowed",
  },
  { kind: "messages", label: "messages.csv", required: false, hint: "Text to read for commitments" },
  { kind: "images", label: "images.csv", required: false, hint: "Receipt text to read" },
];

function kb(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}


function Steps({ active }: { active: number }) {
  const steps = ["Upload", "Process", "Results"];
  return (
    <ol className="flex flex-wrap items-center gap-3">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-3">
          <span
            className={`label-caps ${i === active ? "text-primary" : "text-muted-foreground"}`}
          >
            {i + 1}. {s}
          </span>
          {i < steps.length - 1 && <span className="h-px w-8 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function CsvZone({
  kind,
  label,
  required,
  hint,
  meta,
  onFile,
}: {
  kind: Kind;
  label: string;
  required: boolean;
  hint: string;
  meta?: FileMeta | undefined;
  onFile: (kind: Kind, file: File) => void;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(kind, file);
      }}
      onClick={() => input.current?.click()}
      className={`cursor-pointer rounded-lg border p-5 transition-colors ${
        over ? "border-primary bg-muted" : "border-border bg-card hover:bg-muted/60"
      }`}
    >
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(kind, file);
          e.target.value = "";
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="label-caps text-muted-foreground">
          {required ? "Required" : "Optional"}
        </span>
      </div>

      {meta ? (
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs">
          <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
          <span className="num">
            {meta.name} · {kb(meta.size)} · {meta.rows.toLocaleString("en-IN")} rows
          </span>
        </div>
      ) : (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          Drop the file here, or click to choose one.
        </p>
      )}
    </div>
  );
}

function UploadPage() {
  const state = useFinSafe();
  const navigate = useNavigate();
  const mediaInput = useRef<HTMLInputElement>(null);

  async function handleCsv(kind: Kind, file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("We couldn't read that file — is it a CSV?");
      return;
    }
    try {
      const rows = await parseCsv(file);
      const meta: FileMeta = { name: file.name, size: file.size, rows: rows.length };
      if (kind === "requests") {
        finsafe.set({
          requests: toRequests(rows),
          files: { ...state.files, requests: meta },
        });
      } else if (kind === "users") {
        finsafe.set({ users: toUsers(rows), files: { ...state.files, users: meta } });
      } else {
        finsafe.set({
          transactions: toTransactions(rows),
          files: { ...state.files, transactions: meta },
        });
      }
      toast.success(`${file.name} read — ${rows.length.toLocaleString("en-IN")} rows`);
    } catch {
      toast.error("We couldn't read that file — is it a CSV?");
    }
  }

  function addMedia(files: FileList | null) {
    if (!files?.length) return;
    const next: MediaFileMeta[] = Array.from(files).map((f) => ({
      filename: f.name,
      size: f.size,
      type: f.type || "file",
      ...(f.type.startsWith("image/") ? { preview: URL.createObjectURL(f) } : {}),
    }));
    finsafe.set({ media: [...state.media, ...next] });
  }

  function start() {
    if (!state.requests.length) {
      toast.error("Add a requests file first — that's the list we analyse.");
      return;
    }
    finsafe.set({ results: [], logs: [], progress: 0, running: false });
    navigate({ to: "/processing" });
  }

  const config = state.config;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <Steps active={0} />
        <h1 className="mt-6 font-display text-3xl font-semibold">
          Step 1: Upload Your Financial Data
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Only the requests file is required. The more you add, the sharper the recommendation.
        </p>

        <section className="mt-10">
          <h2 className="label-caps text-muted-foreground">Section A — Spreadsheets</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {zones.map((z) => (
              <CsvZone key={z.kind} {...z} meta={state.files[z.kind]} onFile={handleCsv} />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="label-caps text-muted-foreground">Section B — Receipts & screenshots</h2>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addMedia(e.dataTransfer.files);
            }}
            onClick={() => mediaInput.current?.click()}
            className="mt-4 cursor-pointer rounded-lg border border-border bg-card p-6 hover:bg-muted/60"
          >
            <input
              ref={mediaInput}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                addMedia(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Drop images or PDFs here, or click to choose.
            </div>
          </div>

          {state.media.length > 0 && (
            <ul className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {state.media.map((m, i) => (
                <li key={`${m.filename}-${i}`} className="paper-card overflow-hidden">
                  <div className="flex h-24 items-center justify-center bg-muted">
                    {m.preview ? (
                      <img src={m.preview} alt={m.filename} className="h-24 w-full object-cover" />
                    ) : (
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">{m.filename}</p>
                      <p className="num mt-1 text-[11px] text-muted-foreground">
                        {kb(m.size)} · {m.type}
                      </p>
                    </div>
                    <button
                      aria-label={`Remove ${m.filename}`}
                      onClick={() =>
                        finsafe.set({ media: state.media.filter((_, idx) => idx !== i) })
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="label-caps text-muted-foreground">Section C — Configuration</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="paper-card space-y-4 p-5">
              <Toggle
                label="Read uploaded images"
                checked={config.useVlm}
                onChange={(v) => finsafe.set({ config: { ...config, useVlm: v } })}
              />
              <Toggle
                label="Write a written explanation"
                checked={config.useLlm}
                onChange={(v) => finsafe.set({ config: { ...config, useLlm: v } })}
              />
              <Toggle
                label="Download matches my uploaded file"
                checked={config.matchUploadedSchema}
                onChange={(v) => finsafe.set({ config: { ...config, matchUploadedSchema: v } })}
              />
            </div>
            <div className="paper-card space-y-5 p-5">
              <div>
                <label className="label-caps text-muted-foreground" htmlFor="model">
                  Model
                </label>
                <select
                  id="model"
                  value={config.model}
                  onChange={(e) => finsafe.set({ config: { ...config, model: e.target.value } })}
                  className="mt-1 w-full border-b border-border bg-transparent py-2 text-sm outline-none focus:border-primary"
                >
                  <option>Gemini 2.0</option>
                  <option>GPT-4o</option>
                  <option>Claude 4</option>
                </select>
              </div>
              <div>
                <label className="label-caps text-muted-foreground" htmlFor="forecast">
                  Forecast period (days)
                </label>
                <input
                  id="forecast"
                  type="number"
                  min={30}
                  max={720}
                  value={config.forecastDays}
                  onChange={(e) =>
                    finsafe.set({
                      config: { ...config, forecastDays: Number(e.target.value) || 90 },
                    })
                  }
                  className="num mt-1 w-full border-b border-border bg-transparent py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </section>

        <button
          onClick={start}
          className="mt-10 w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-paper hover:opacity-90"
        >
          Start AI Analysis →
        </button>
      </main>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`h-5 w-9 rounded-full border transition-colors ${
          checked ? "border-primary bg-primary" : "border-border bg-muted"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-card transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
