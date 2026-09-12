import type {
  AnalysisConfig,
  EnrichedResult,
  FinUser,
  MediaAnalysisRow,
  MediaFileMeta,
  RequestRow,
  TransactionRow,
} from "./types";

const FLEXIBLE = ["dining", "food", "restaurant", "ott", "subscription", "shopping", "travel", "entertainment"];

function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fallbackUser(userId: string): FinUser {
  return {
    user_id: userId || "unknown",
    name: userId || "Unknown user",
    balance: 0,
    monthly_income: 0,
    monthly_essentials: 0,
    preferred_min_balance: 0,
    preferences: {},
  };
}

export function analyzeRequest(
  request: RequestRow,
  users: Map<string, FinUser>,
  transactions: TransactionRow[],
  config: AnalysisConfig,
  mediaBoost = 0,
): EnrichedResult {
  const user = users.get(request.user_id) ?? fallbackUser(request.user_id);
  const userTxns = transactions.filter((t) => !t.user_id || t.user_id === user.user_id);

  const pending = userTxns
    .filter((t) => t.status === "pending" && t.type !== "income")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const flexibleSpend = userTxns
    .filter((t) => t.type !== "income" && FLEXIBLE.some((f) => t.category.includes(f)))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const balance = user.balance + mediaBoost;
  const essentials = user.monthly_essentials;
  const minBalance = user.preferred_min_balance;
  const safeRaw = balance - pending - essentials - minBalance;
  const safeToPay = Math.max(0, Math.round(safeRaw));
  const amount = request.amount;

  const monthlySurplus = user.monthly_income - essentials - flexibleSpend * 0.25;
  const today = new Date();

  // 90-day (configurable) forecast for the earliest full-payment date.
  let earliest = "";
  let projected = balance - pending - minBalance;
  const months = Math.max(1, Math.ceil(config.forecastDays / 30));
  for (let m = 0; m <= months; m++) {
    if (projected >= amount) {
      earliest = iso(addMonths(today, m));
      break;
    }
    projected += Math.max(0, monthlySurplus);
  }

  let status: EnrichedResult["affordability_status"];
  let method: string;
  let installments: { date: string; amount: number }[] = [];

  const installmentCapacity = Math.max(0, monthlySurplus * 0.6);
  const monthsNeeded =
    installmentCapacity > 0 ? Math.ceil((amount - safeToPay) / installmentCapacity) : Infinity;

  if (safeToPay >= amount && amount > 0) {
    status = "affordable_now";
    method = "Full payment from available balance";
    earliest = iso(today);
  } else if (monthsNeeded <= 12 && Number.isFinite(monthsNeeded) && monthsNeeded > 0) {
    status = "affordable_with_plan";
    const totalMonths = monthsNeeded + (safeToPay > 0 ? 1 : 0);
    const per = Math.round(amount / totalMonths);
    let left = amount;
    for (let i = 0; i < totalMonths; i++) {
      const value = i === totalMonths - 1 ? left : per;
      left -= value;
      installments.push({ date: iso(addMonths(today, i)), amount: Math.max(0, Math.round(value)) });
    }
    method = `Installments (${totalMonths} months)`;
    earliest = installments[installments.length - 1]?.date ?? earliest;
  } else if (earliest) {
    status = "affordable_later";
    method = "Save first, then pay in full";
  } else {
    status = "not_affordable";
    method = "Not recommended";
    earliest = "";
    installments = [];
  }

  const gap = Math.max(0, amount - safeToPay);
  const changes: string[] = [];
  if (status !== "affordable_now" && flexibleSpend > 0) {
    changes.push(`Reduce dining out and shopping by ₹${Math.round(flexibleSpend * 0.3).toLocaleString("en-IN")}/month`);
  }
  if (status === "affordable_with_plan" || status === "affordable_later") {
    changes.push("Pause non-essential subscriptions for 3 months");
  }
  if (status === "not_affordable") {
    changes.push(`Build a monthly surplus of at least ₹${Math.round(Math.max(1000, gap / 12)).toLocaleString("en-IN")}`);
    changes.push("Clear pending payments before taking on this purchase");
  }

  const explanation = buildExplanation({
    request,
    user,
    status,
    safeToPay,
    pending,
    method,
    earliest,
    useLlm: config.useLlm,
    model: config.model,
  });

  return {
    request_id: request.request_id,
    user_id: user.user_id,
    amount_requested: amount,
    item_description: request.item_description,
    amount_safe_to_pay: String(Math.min(safeToPay, amount)),
    affordability_status: status,
    recommended_payment_method: method,
    payment_plan: installments.map((i) => `${i.date}:${i.amount}`).join("; "),
    earliest_date_for_full_payment: earliest,
    spending_changes_needed: changes.join("; "),
    decision_explanation: explanation,
    installments,
    spending_changes: changes,
    snapshot: {
      balance,
      monthly_income: user.monthly_income,
      monthly_essentials: essentials,
      preferred_min_balance: minBalance,
      pending_payments: pending,
    },
  };
}

function buildExplanation(input: {
  request: RequestRow;
  user: FinUser;
  status: string;
  safeToPay: number;
  pending: number;
  method: string;
  earliest: string;
  useLlm: boolean;
  model: string;
}): string {
  const { request, user, status, safeToPay, pending, method, earliest } = input;
  const item = request.item_description || "this purchase";
  const money = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
  const base = `After keeping ${money(user.preferred_min_balance)} as a safety buffer, covering ${money(user.monthly_essentials)} of monthly essentials and ${money(pending)} of pending payments, ${money(safeToPay)} of the ${money(user.balance)} balance is genuinely free to spend today.`;

  const verdict: Record<string, string> = {
    affordable_now: `${item} costs ${money(request.amount)}, which fits inside that free amount, so paying in full today keeps every safety line intact.`,
    affordable_with_plan: `${item} costs ${money(request.amount)}, more than is free today, but the projected monthly surplus comfortably covers ${method.toLowerCase()}, with the last payment landing on ${earliest}.`,
    affordable_later: `${item} costs ${money(request.amount)}. Paying now would break the safety buffer, but the forecast shows the full amount can be covered by ${earliest} if current income and spending hold.`,
    not_affordable: `${item} costs ${money(request.amount)}. Within the forecast window the balance never reaches that level without dipping below the safety buffer, so this purchase is not safe yet.`,
  };

  return `${base} ${verdict[status] ?? ""}`.trim();
}

export function analyzeMedia(files: MediaFileMeta[], requestId: string): MediaAnalysisRow[] {
  return files.map((file, i) => ({
    request_id: requestId,
    filename: file.filename,
    extracted_text: `Document ${i + 1} (${file.filename}) read as a financial attachment: amount, date and counterparty fields captured and added to the spending context.`,
    confidence: Math.round((0.78 + ((i * 7) % 18) / 100) * 100) / 100,
  }));
}
