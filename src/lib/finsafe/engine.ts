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

/**
 * Derive a profile from real transactions only. Never fabricated from the
 * request amount — if there is no data we return null and say so.
 */
function deriveUserFromTransactions(userId: string, txns: TransactionRow[]): FinUser | null {
  const id = userId || "unknown";
  const mine = txns.filter((t) => t.user_id === id);
  if (!mine.length) return null;

  const income = mine.filter((t) => t.type === "income").reduce((s, t) => s + Math.abs(t.amount), 0);
  const spend = mine.filter((t) => t.type !== "income").reduce((s, t) => s + Math.abs(t.amount), 0);
  const essentials = mine
    .filter(
      (t) => t.type !== "income" && !FLEXIBLE.some((f) => (t.category || "").toLowerCase().includes(f)),
    )
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const monthsSpan = Math.max(1, Math.round(mine.length / 12));
  const monthlyIncome = Math.round(income / monthsSpan);
  const monthlyEssentials = Math.round(essentials / monthsSpan);

  return {
    user_id: id,
    name: id,
    balance: Math.max(0, Math.round(income - spend)),
    monthly_income: monthlyIncome,
    monthly_essentials: monthlyEssentials,
    preferred_min_balance: Math.round(monthlyEssentials * 0.5),
    preferences: { derived_from: "transactions" },
  };
}

function resolveUser(
  userId: string,
  users: Map<string, FinUser>,
  transactions: TransactionRow[],
): FinUser | null {
  return users.get(userId) ?? deriveUserFromTransactions(userId, transactions);
}

/** Earliest month where the free balance covers the full amount. */
function findEarliestFullPaymentDate(
  balance: number,
  pending: number,
  minBalance: number,
  monthlySurplus: number,
  amount: number,
  forecastDays: number,
  today: Date,
): string | null {
  let projected = balance - pending - minBalance;
  if (projected >= amount) return iso(today);

  const months = Math.max(1, Math.ceil(forecastDays / 30));
  for (let m = 1; m <= months; m++) {
    projected += Math.max(0, monthlySurplus);
    if (projected >= amount) return iso(addMonths(today, m));
  }
  return null;
}

function buildPaymentPlan(
  amount: number,
  safeToPay: number,
  monthlySurplus: number,
  today: Date,
  allowsPartial: boolean,
): { plan: { date: string; amount: number }[]; method: string; earliest: string } | null {
  if (!allowsPartial && safeToPay < amount) return null;

  const gap = amount - safeToPay;
  if (gap <= 0) {
    return {
      plan: [{ date: iso(today), amount: Math.round(amount) }],
      method: "Full payment from available balance",
      earliest: iso(today),
    };
  }

  const monthlyCapacity = Math.max(0, monthlySurplus * 0.7);
  if (monthlyCapacity <= 0) return null;

  const monthsNeeded = Math.ceil(gap / monthlyCapacity);
  if (monthsNeeded > 12) return null;

  const per = Math.round(gap / monthsNeeded);
  const plan: { date: string; amount: number }[] = [];
  let left = gap;
  for (let i = 0; i < monthsNeeded; i++) {
    const value = i === monthsNeeded - 1 ? left : per;
    left -= value;
    plan.push({ date: iso(addMonths(today, i + 1)), amount: Math.max(0, Math.round(value)) });
  }

  return { plan, method: `Installments (${monthsNeeded} months)`, earliest: plan[plan.length - 1]!.date };
}

/** Spending changes derived from the person's own transaction categories. */
function deriveSpendingChanges(
  userTxns: TransactionRow[],
  status: string,
  gap: number,
): string[] {
  const changes: string[] = [];
  const flexibleCats = new Map<string, number>();

  userTxns
    .filter((t) => t.type !== "income")
    .forEach((t) => {
      const cat = (t.category || "other").toLowerCase();
      if (FLEXIBLE.some((f) => cat.includes(f))) {
        flexibleCats.set(cat, (flexibleCats.get(cat) || 0) + Math.abs(t.amount));
      }
    });

  if (status !== "affordable_now") {
    const sorted = [...flexibleCats.entries()].sort((a, b) => b[1] - a[1]);
    for (const [cat, spend] of sorted.slice(0, 3)) {
      const cut = Math.round(spend * 0.3);
      if (cut > 0) changes.push(`Reduce ${cat} by ₹${cut.toLocaleString("en-IN")}/month`);
    }
    if (!changes.length) changes.push("Review non-essential spending categories");
  } else {
    changes.push("No spending changes needed for this purchase");
  }

  if (status === "not_affordable") {
    changes.push(
      `Build a monthly surplus of at least ₹${Math.round(Math.max(1000, gap / 12)).toLocaleString("en-IN")}`,
    );
  }

  return changes;
}

export function analyzeRequest(
  request: RequestRow,
  users: Map<string, FinUser>,
  transactions: TransactionRow[],
  config: AnalysisConfig,
  mediaBoost = 0,
): EnrichedResult {
  const user = resolveUser(request.user_id, users, transactions);
  if (!user) {
    return {
      request_id: request.request_id,
      user_id: request.user_id,
      amount_requested: request.amount,
      item_description: request.item_description,
      amount_safe_to_pay: "0",
      affordability_status: "not_affordable",
      recommended_payment_method: "Not recommended",
      payment_plan: "No user profile available",
      earliest_date_for_full_payment: "beyond_forecast_window",
      spending_changes_needed: "Provide user profile data (users file or transaction history)",
      decision_explanation:
        "No financial profile could be resolved for this user. Please upload a people file containing this user_id, or provide their transaction history.",
      installments: [],
      spending_changes: [],
      snapshot: {
        balance: 0,
        monthly_income: 0,
        monthly_essentials: 0,
        preferred_min_balance: 0,
        pending_payments: 0,
      },
    };
  }

  const userTxns = transactions.filter((t) => !t.user_id || t.user_id === user.user_id);

  const pending = userTxns
    .filter((t) => t.status === "pending" && t.type !== "income")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const flexibleSpend = userTxns
    .filter(
      (t) => t.type !== "income" && FLEXIBLE.some((f) => (t.category || "").toLowerCase().includes(f)),
    )
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const balance = user.balance + mediaBoost;
  const essentials = user.monthly_essentials;
  const minBalance = user.preferred_min_balance;

  const safeRaw = balance - pending - essentials - minBalance;
  const safeToPay = Math.max(0, Math.round(safeRaw));
  const amount = request.amount;

  const monthlySurplus = Math.max(0, user.monthly_income - essentials - flexibleSpend * 0.5);

  const today = new Date();
  const forecastDays = config.forecastDays || 90;

  const earliestFull = findEarliestFullPaymentDate(
    balance,
    pending,
    minBalance,
    monthlySurplus,
    amount,
    forecastDays,
    today,
  );

  let status: EnrichedResult["affordability_status"];
  let method: string;
  let installments: { date: string; amount: number }[] = [];
  let earliestDate = earliestFull || "";

  const allowsPartial = request.allows_partial_payment !== false;

  if (safeToPay >= amount && amount > 0) {
    status = "affordable_now";
    method = "Full payment from available balance";
    earliestDate = iso(today);
    installments = [{ date: iso(today), amount: Math.round(amount) }];
  } else {
    const plan = buildPaymentPlan(amount, safeToPay, monthlySurplus, today, allowsPartial);
    if (plan) {
      status = "affordable_with_plan";
      method = plan.method;
      installments = plan.plan;
      // The earliest safe full-payment date is independent of the instalment
      // schedule — keep the forecast date when it lands sooner.
      earliestDate = earliestFull ?? plan.earliest;
    } else if (earliestFull) {
      status = "affordable_later";
      method = `Save until ${earliestFull}, then pay in full`;
      earliestDate = earliestFull;
    } else {
      status = "not_affordable";
      method = "Not recommended";
      earliestDate = "beyond_forecast_window";
    }
  }

  const gap = Math.max(0, amount - safeToPay);
  const changes = deriveSpendingChanges(userTxns, status, gap);

  const explanation = buildExplanation({
    request,
    user,
    status,
    safeToPay,
    pending,
    method,
    earliest: earliestDate,
    monthlySurplus,
  });

  const paymentPlanStr =
    installments.length > 0
      ? installments.map((i) => `${i.date}:${i.amount}`).join("; ")
      : status === "affordable_later"
        ? `Save until ${earliestDate}, then one full payment of ${Math.round(amount)}`
        : "No viable payment plan within the forecast window";

  return {
    request_id: request.request_id,
    user_id: user.user_id,
    amount_requested: amount,
    item_description: request.item_description,
    amount_safe_to_pay: String(Math.min(safeToPay, amount)),
    affordability_status: status,
    recommended_payment_method: method,
    payment_plan: paymentPlanStr,
    earliest_date_for_full_payment: earliestDate || "beyond_forecast_window",
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
  monthlySurplus: number;
}): string {
  const { request, user, status, safeToPay, pending, method, earliest, monthlySurplus } = input;
  const item = request.item_description || "this purchase";
  const money = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

  const base =
    `After keeping ${money(user.preferred_min_balance)} as a safety buffer, covering ` +
    `${money(user.monthly_essentials)} of monthly essentials and ${money(pending)} of pending ` +
    `payments, ${money(safeToPay)} of the ${money(user.balance)} balance is genuinely free to ` +
    `spend today. Monthly surplus available for this goal: ${money(monthlySurplus)}.`;

  const partialNote =
    request.allows_partial_payment === false ? " Partial payment is not allowed for this request." : "";

  const verdict: Record<string, string> = {
    affordable_now: `${item} costs ${money(request.amount)}, which fits inside that free amount, so paying in full today keeps every safety line intact.`,
    affordable_with_plan: `${item} costs ${money(request.amount)}, more than is free today, but the projected monthly surplus covers ${method.toLowerCase()}, with the last payment landing on ${earliest}.`,
    affordable_later: `${item} costs ${money(request.amount)}. Paying now would break the safety buffer, but the forecast shows the full amount can be covered by ${earliest} if current income and spending hold.`,
    not_affordable: `${item} costs ${money(request.amount)}. Within the forecast window the balance never reaches that level without dipping below the safety buffer, so this purchase is not safe yet.`,
  };

  return `${base} ${verdict[status] ?? ""}${partialNote}`.trim();
}

/**
 * Media analysis placeholder. No amounts are invented: files are recorded and
 * clearly marked as awaiting real extraction, and they never change the balance.
 */
export function analyzeMedia(files: MediaFileMeta[], requestId: string): MediaAnalysisRow[] {
  return files.map((file) => ({
    request_id: requestId,
    filename: file.filename,
    extracted_text: `[Extraction pending] File: ${file.filename}. No financial amount detected in this file.`,
    confidence: 0.5,
  }));
}
