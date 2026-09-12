export function inr(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

export function statusLabel(status: string): string {
  switch (status) {
    case "affordable_now":
      return "Affordable now";
    case "affordable_with_plan":
      return "Affordable with plan";
    case "affordable_later":
      return "Affordable later";
    case "not_affordable":
      return "Not affordable";
    default:
      return status || "—";
  }
}

export function nowStamp(): string {
  return new Date().toTimeString().slice(0, 8);
}
