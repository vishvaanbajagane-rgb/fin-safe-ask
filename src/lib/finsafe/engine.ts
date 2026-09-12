import type {
  AnalysisConfig,
  EnrichedResult,
  ExchangeRateRow,
  FinUser,
  ImageRow,
  MediaAnalysisRow,
  MediaFileMeta,
  MessageRow,
  PaymentOptionRow,
  RequestRow,
  TransactionRow,
} from "./types";

const FLEXIBLE = [
  "dining",
  "food",
  "restaurant",
  "ott",
  "subscription",
  "shopping",
  "travel",
  "entertainment",
];

export interface AnalysisContext {
  users: Map<string, FinUser>;
  transactions: TransactionRow[];
  rates: Map<string, number>;
  paymentOptions: Map<string, PaymentOptionRow>;
  messages: MessageRow[];
  images: ImageRow[];
  config: AnalysisConfig;
}

/* ------------------------------------------------------------------ */
/* Currency                                                            */
/* ------------------------------------------------------------------ */

export function buildRateMap(rows: ExchangeRateRow[]): Map<string, number> {
  const map = new Map<string, number>([["INR", 1]]);
  for (const row of rows) {
    if (!row.currency) continue;
    const rate = Number.isFinite(row.rate_to_inr) && row.rate_to_inr > 0 ? row.rate_to_inr : 1;
    map.set(row.currency.toUpperCase(), rate);
  }
  return map;
}

/** Convert any amount into the base currency (INR). */
export function convertToINR(amount: number, currency: string, rates: Map<string, number>): number {
  if (!Number.isFinite(amount)) return 0;
  const code = (currency || "INR").toUpperCase();
  const rate = rates.get(code);
  return amount * (rate && rate > 0 ? rate : 1);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const money = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Pull money amounts out of free text (messages, OCR output). */
export function extractAmounts(text: string): number[] {
  if (!text) return [];
  const out: number[] = [];
  const patterns = [
    /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/gi,
    /([\d,]+(?:\.\d+)?)\s*(?:inr|rupees|rs\b)/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const value = Number.parseFloat((m[1] ?? "").replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0) out.push(value);
    }
  }
  return out;
}

const OBLIGATION_WORDS = [
  "pay",
  "due",
  "rent",
  "bill",
  "emi",
  "installment",
  "instalment",
  "loan",
  "fees",
  "premium",
  "repay",
  "owe",
];

/** Amounts a person has committed to but not yet paid, read from their messages. */
function pendingFromMessages(
  messages: MessageRow[],
  rates: Map<string, number>,
): { total: number; notes: string[] } {
  let total = 0;
  const notes: string[] = [];
  for (const msg of messages) {
    const text = (msg.text || "").toLowerCase();
    if (!OBLIGATION_WORDS.some((w) => text.includes(w))) continue;
    const amounts = extractAmounts(msg.text);
    if (!amounts.length) continue;
    const largest = Math.max(...amounts);
    const inr = convertToINR(largest, msg.currency, rates);
    total += inr;
    notes.push(`${money(inr)} mentioned in a message ("${msg.text.slice(0, 60)}")`);
  }
  return { total, notes };
}

/** Expenses read from receipt images / VLM output. */
function expensesFromImages(
  images: ImageRow[],
  rates: Map<string, number>,
): { total: number; notes: string[] } {
  let total = 0;
  const notes: string[] = [];
  for (const img of images) {
    const amounts = extractAmounts(img.extracted_text);
    if (!amounts.length) continue;
    const largest = Math.max(...amounts);
    const inr = convertToINR(largest, img.currency, rates);
    total += inr;
    notes.push(`${money(inr)} receipt (${img.filename || "image"})`);
  }
  return { total, notes };
}

/* ------------------------------------------------------------------ */
/* Profile resolution — never fabricated                               */
/* ------------------------------------------------------------------ */

function deriveUserFromTransactions(
  userId: string,
  txns: TransactionRow[],
  rates: Map<string, number>,
): FinUser | null {
  const id = userId || "unknown";
  const mine = txns.filter((t) => t.user_id === id);
  if (!mine.length) return null;

  const amt = (t: TransactionRow) => Math.abs(convertToINR(t.amount, t.currency, rates));
  const income = mine.filter((t) => t.type === "income").reduce((s, t) => s + amt(t), 0);
  const spend = mine.filter((t) => t.type !== "income").reduce((s, t) => s + amt(t), 0);
  const essentials = mine
    .filter(
      (t) => t.type !== "income" && !FLEXIBLE.some((f) => (t.category || "").toLowerCase().includes(f)),
    )
    .reduce((s, t) => s + amt(t), 0);

  const monthsSpan = Math.max(1, Math.round(mine.length / 12));

  return {
    user_id: id,
    name: id,
    currency: "INR",
    balance: Math.max(0, Math.round(income - spend)),
    monthly_income: Math.round(income / monthsSpan),
    monthly_essentials: Math.round(essentials / monthsSpan),
    preferred_min_balance: Math.round((essentials / monthsSpan) * 0.5),
    preferences: { derived_from: "financial_events" },
  };
}

function resolveUser(
  userId: string,
  ctx: AnalysisContext,
): { user: FinUser; converted: boolean } | null {
  const profile = ctx.users.get(userId);
  if (profile) return { user: profile, converted: false };
  const derived = deriveUserFromTransactions(userId, ctx.transactions, ctx.rates);
  return derived ? { user: derived, converted: true } : null;
}

/* ------------------------------------------------------------------ */
/* Forecast                                                            */
/* ------------------------------------------------------------------ */

/**
 * First month in the forecast window where the projected balance covers the
 * full amount while still leaving the safety buffer untouched.
 */
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
  if (monthlySurplus <= 0) return null;

  const months = Math.max(1, Math.ceil(forecastDays / 30));
  for (let m = 1; m <= months; m++) {
    projected += monthlySurplus;
    if (projected >= amount) return iso(addMonths(today, m));
  }
  return null;
}

function buildPaymentPlan(
  amount: number,
  safeToPay: number,
  monthlySurplus: number,
  today: Date,
  maxMonths: number,
): { plan: { date: string; amount: number }[]; method: string; earliest: string } | null {
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
  if (monthsNeeded > Math.max(1, maxMonths)) return null;

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

/* ------------------------------------------------------------------ */
/* Spending advice — derived from the person's own events              */
/* ------------------------------------------------------------------ */

function deriveSpendingChanges(
  userTxns: TransactionRow[],
  rates: Map<string, number>,
  status: string,
  gap: number,
  messageNotes: string[],
): string[] {
  const changes: string[] = [];

  if (status === "affordable_now") {
    changes.push("No spending changes needed for this purchase");
    return changes;
  }

  const months = Math.max(1, Math.round(userTxns.length / 12));
  const byCategory = new Map<string, number>();
  for (const t of userTxns) {
    if (t.type === "income") continue;
    const cat = (t.category || "other").toLowerCase();
    if (!FLEXIBLE.some((f) => cat.includes(f))) continue;
    const inr = Math.abs(convertToINR(t.amount, t.currency, rates));
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + inr);
  }

  const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  for (const [cat, spend] of sorted.slice(0, 3)) {
    const monthly = spend / months;
    const isSubscription = cat.includes("subscription") || cat.includes("ott");
    const cut = Math.round(isSubscription ? monthly : monthly * 0.3);
    if (cut <= 0) continue;
    changes.push(
      isSubscription
        ? `Pause ${cat} (${money(monthly)}/month)`
        : `Reduce ${cat} by ${money(cut)}/month`,
    );
  }

  if (!changes.length) changes.push("Review non-essential spending categories");

  if (messageNotes.length) {
    changes.push(`Clear the commitments found in messages first: ${messageNotes[0]}`);
  }

  if (status === "not_affordable" && gap > 0) {
    changes.push(`Build a monthly surplus of at least ${money(Math.max(1000, gap / 12))}`);
  }

  return changes;
}

/* ------------------------------------------------------------------ */
/* Main analysis                                                       */
/* ------------------------------------------------------------------ */

export function analyzeRequest(request: RequestRow, ctx: AnalysisContext): EnrichedResult {
  const rates = ctx.rates;
  const resolved = resolveUser(request.user_id, ctx);
  const amount = convertToINR(request.amount, request.currency, rates);

  if (!resolved) {
    return {
      request_id: request.request_id,
      user_id: request.user_id,
      amount_requested: amount,
      item_description: request.item_description,
      amount_safe_to_pay: "0",
      affordability_status: "not_affordable",
      recommended_payment_method: "Not recommended",
      payment_plan: "No user profile available",
      earliest_date_for_full_payment: "beyond_forecast_window",
      spending_changes_needed: "Provide financial_profiles.csv or financial_events.csv for this user",
      decision_explanation:
        "No financial profile could be resolved for this user. Upload financial_profiles.csv containing this user_id, or provide their financial_events.csv history.",
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

  const { user, converted } = resolved;
  // A derived profile is already expressed in INR; a profile row is not.
  const toBase = (value: number) => (converted ? value : convertToINR(value, user.currency, rates));

  const userTxns = ctx.transactions.filter((t) => t.user_id === user.user_id);
  const userMessages = ctx.messages.filter(
    (m) => m.user_id === user.user_id || (m.request_id && m.request_id === request.request_id),
  );
  const userImages = ctx.images.filter(
    (i) => i.user_id === user.user_id || (i.request_id && i.request_id === request.request_id),
  );

  const pendingEvents = userTxns
    .filter((t) => t.status === "pending" && t.type !== "income")
    .reduce((sum, t) => sum + Math.abs(convertToINR(t.amount, t.currency, rates)), 0);

  const fromMessages = ctx.config.useLlm
    ? pendingFromMessages(userMessages, rates)
    : { total: 0, notes: [] as string[] };
  const fromImages = ctx.config.useVlm
    ? expensesFromImages(userImages, rates)
    : { total: 0, notes: [] as string[] };

  const pending = pendingEvents + fromMessages.total + fromImages.total;

  const months = Math.max(1, Math.round(userTxns.length / 12));
  const flexibleSpend =
    userTxns
      .filter(
        (t) =>
          t.type !== "income" && FLEXIBLE.some((f) => (t.category || "").toLowerCase().includes(f)),
      )
      .reduce((sum, t) => sum + Math.abs(convertToINR(t.amount, t.currency, rates)), 0) / months;

  const balance = toBase(user.balance);
  const essentials = toBase(user.monthly_essentials);
  const minBalance = toBase(user.preferred_min_balance);
  const income = toBase(user.monthly_income);

  const safeToPay = Math.max(0, Math.round(balance - pending - essentials - minBalance));
  const monthlySurplus = Math.max(0, income - essentials - flexibleSpend);

  const today = new Date();
  const forecastDays = ctx.config.forecastDays || 90;

  const earliestFull = findEarliestFullPaymentDate(
    balance,
    pending,
    minBalance,
    monthlySurplus,
    amount,
    forecastDays,
    today,
  );

  const option = ctx.paymentOptions.get(request.request_id);
  const allowsPartial =
    option?.allows_partial_payment ?? request.allows_partial_payment ?? true;
  const allowsInstallments = (option?.allows_installments ?? allowsPartial) && allowsPartial;
  const maxMonths = option?.max_installments && option.max_installments > 0 ? option.max_installments : 12;

  let status: EnrichedResult["affordability_status"];
  let method: string;
  let installments: { date: string; amount: number }[] = [];
  let earliestDate = earliestFull ?? "";

  if (amount > 0 && safeToPay >= amount) {
    status = "affordable_now";
    method = "Full payment from available balance";
    earliestDate = iso(today);
    installments = [{ date: iso(today), amount: Math.round(amount) }];
  } else {
    const plan = allowsInstallments
      ? buildPaymentPlan(amount, safeToPay, monthlySurplus, today, maxMonths)
      : null;
    if (plan) {
      status = "affordable_with_plan";
      method = plan.method;
      installments = plan.plan;
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
  const changes = deriveSpendingChanges(userTxns, rates, status, gap, fromMessages.notes);

  const explanation = buildExplanation({
    request,
    amount,
    balance,
    essentials,
    minBalance,
    status,
    safeToPay,
    pending,
    method,
    earliest: earliestDate,
    monthlySurplus,
    allowsPartial,
    currencyNote:
      (request.currency || "INR").toUpperCase() !== "INR" || user.currency.toUpperCase() !== "INR"
        ? ` Amounts were converted to INR from ${[request.currency, user.currency]
            .map((c) => (c || "INR").toUpperCase())
            .filter((c, i, a) => a.indexOf(c) === i)
            .join(" / ")} using the uploaded exchange rates.`
        : "",
    mediaNotes: [...fromMessages.notes, ...fromImages.notes],
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
    amount_requested: Math.round(amount),
    item_description: request.item_description,
    amount_safe_to_pay: String(Math.min(safeToPay, Math.round(amount) || safeToPay)),
    affordability_status: status,
    recommended_payment_method: method,
    payment_plan: paymentPlanStr,
    earliest_date_for_full_payment: earliestDate || "beyond_forecast_window",
    spending_changes_needed: changes.join("; "),
    decision_explanation: explanation,
    installments,
    spending_changes: changes,
    snapshot: {
      balance: Math.round(balance),
      monthly_income: Math.round(income),
      monthly_essentials: Math.round(essentials),
      preferred_min_balance: Math.round(minBalance),
      pending_payments: Math.round(pending),
    },
  };
}

function buildExplanation(input: {
  request: RequestRow;
  amount: number;
  balance: number;
  essentials: number;
  minBalance: number;
  status: string;
  safeToPay: number;
  pending: number;
  method: string;
  earliest: string;
  monthlySurplus: number;
  allowsPartial: boolean;
  currencyNote: string;
  mediaNotes: string[];
}): string {
  const {
    request,
    amount,
    balance,
    essentials,
    minBalance,
    status,
    safeToPay,
    pending,
    method,
    earliest,
    monthlySurplus,
    allowsPartial,
    currencyNote,
    mediaNotes,
  } = input;
  const item = request.item_description || "this purchase";

  const base =
    `After keeping ${money(minBalance)} as a safety buffer, covering ${money(essentials)} of ` +
    `monthly essentials and ${money(pending)} of pending commitments, ${money(safeToPay)} of the ` +
    `${money(balance)} balance is genuinely free to spend today. Monthly surplus available for ` +
    `this goal: ${money(monthlySurplus)}.`;

  const verdict: Record<string, string> = {
    affordable_now: `${item} costs ${money(amount)}, which fits inside that free amount, so paying in full today keeps every safety line intact.`,
    affordable_with_plan: `${item} costs ${money(amount)}, more than is free today, but the projected monthly surplus covers ${method.toLowerCase()}, and the full amount is safely covered by ${earliest}.`,
    affordable_later: `${item} costs ${money(amount)}. Paying now would break the safety buffer, but the forecast shows the full amount can be covered by ${earliest} if current income and spending hold.`,
    not_affordable: `${item} costs ${money(amount)}. Within the forecast window the balance never reaches that level without dipping below the safety buffer, so this purchase is not safe yet.`,
  };

  const partialNote = allowsPartial
    ? ""
    : " Partial payments and installments are not permitted for this request, so only a full payment was considered.";
  const mediaNote = mediaNotes.length ? ` Signals used: ${mediaNotes.slice(0, 2).join("; ")}.` : "";

  return `${base} ${verdict[status] ?? ""}${partialNote}${currencyNote}${mediaNote}`.trim();
}

/**
 * Media analysis. Text already extracted into images.csv is used directly;
 * files with no extraction yet are recorded without inventing any amount.
 */
export function analyzeMedia(
  files: MediaFileMeta[],
  requestId: string,
  images: ImageRow[] = [],
): MediaAnalysisRow[] {
  return files.map((file) => {
    const known = images.find((i) => i.filename && file.filename.endsWith(i.filename));
    if (known && known.extracted_text) {
      return {
        request_id: requestId,
        filename: file.filename,
        extracted_text: known.extracted_text,
        confidence: 0.9,
      };
    }
    return {
      request_id: requestId,
      filename: file.filename,
      extracted_text: `[Extraction pending] File: ${file.filename}. No financial amount detected in this file.`,
      confidence: 0.5,
    };
  });
}
