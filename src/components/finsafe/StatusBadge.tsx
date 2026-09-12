import { statusLabel } from "@/lib/finsafe/format";

const styles: Record<string, string> = {
  affordable_now: "text-[var(--success)] border-[var(--success)]/40 bg-[var(--success)]/8",
  affordable_with_plan: "text-secondary border-secondary/30 bg-secondary/5",
  affordable_later: "text-[var(--warning)] border-[var(--warning)]/40 bg-[var(--warning)]/8",
  not_affordable: "text-destructive border-destructive/40 bg-destructive/8",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`label-caps inline-flex items-center rounded-sm border px-2 py-[3px] ${
        styles[status] ?? "text-muted-foreground border-border bg-muted"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}
