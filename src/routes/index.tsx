import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Zap, Brain, ArrowRight, FileSpreadsheet, LineChart } from "lucide-react";
import { SiteHeader } from "@/components/finsafe/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinSafe AI — Know Before You Buy" },
      {
        name: "description",
        content:
          "Upload your financial data and FinSafe AI tells you how much of a purchase you can safely afford today, with a payment plan and downloadable results.",
      },
      { property: "og:title", content: "FinSafe AI — Know Before You Buy" },
      {
        property: "og:description",
        content:
          "AI-powered affordability decisions from your balance, income, essentials and pending payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
          <p className="label-caps text-muted-foreground">Affordability intelligence</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Know Before You Buy — AI-Powered Affordability Decisions
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            Upload your financial data. Our AI agent tells you if you can safely afford it — and
            how.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-paper hover:opacity-90"
            >
              Upload Data <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/results"
              className="inline-flex items-center rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-6">
          <article className="paper-card md:col-span-4 p-6">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-display text-xl font-semibold">
              Privacy First — your data stays yours
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Files are parsed in your browser and results are stored only in your own private
              account. Nothing is shared with anyone else.
            </p>
          </article>

          <article className="paper-card md:col-span-2 p-6">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-display text-lg font-semibold">Real-time analysis</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Hundreds of requests scored in seconds, with a live log you can follow.
            </p>
          </article>

          <article className="paper-card md:col-span-2 p-6">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-display text-lg font-semibold">Reasoned decisions</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Every verdict comes with a written explanation, not just a number.
            </p>
          </article>

          <article className="paper-card md:col-span-2 p-6">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-display text-lg font-semibold">Exact CSV output</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Download matches your uploaded schema. Excel, JSON and PDF optional.
            </p>
          </article>

          <article className="paper-card md:col-span-2 p-6">
            <LineChart className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-display text-lg font-semibold">Forward-looking</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A 90-day forecast finds the earliest safe date to pay in full.
            </p>
          </article>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <span className="font-display text-sm font-bold">FinSafe AI</span>
          <nav className="flex flex-wrap gap-6">
            <Link to="/upload" className="label-caps text-muted-foreground hover:text-foreground">
              How it works
            </Link>
            <Link to="/results" className="label-caps text-muted-foreground hover:text-foreground">
              Results
            </Link>
            <Link to="/admin" className="label-caps text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
