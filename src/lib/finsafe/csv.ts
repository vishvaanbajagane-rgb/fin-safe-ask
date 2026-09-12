import Papa from "papaparse";
import type {
  ExchangeRateRow,
  FinUser,
  ImageRow,
  MessageRow,
  PaymentOptionRow,
  RequestRow,
  TransactionRow,
} from "./types";

type Raw = Record<string, string>;

function pick(row: Raw, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const hit = Object.keys(row).find((k) => k.trim().toLowerCase() === key);
    if (hit && row[hit] != null && String(row[hit]).trim() !== "") return String(row[hit]).trim();
  }
  return fallback;
}

function num(value: string): number {
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currency(row: Raw, fallback = "INR"): string {
  const value = pick(row, ["currency", "currency_code", "curr", "ccy"], fallback);
  return value.toUpperCase();
}

export function parseCsv(file: File): Promise<Raw[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Raw>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data.filter((r) => Object.keys(r).length > 0)),
      error: (err: unknown) => reject(err),
    });
  });
}

export function parseCsvText(text: string): Raw[] {
  const res = Papa.parse<Raw>(text, { header: true, skipEmptyLines: true });
  return res.data.filter((r) => r && Object.keys(r).length > 0);
}

function parseBoolean(value: string): boolean | undefined {
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "y") return true;
  if (v === "false" || v === "0" || v === "no" || v === "n") return false;
  return undefined;
}

export function toRequests(rows: Raw[]): RequestRow[] {
  return rows.map((row, index) => {
    const type = pick(row, ["request_type", "type", "category"]);
    const text = pick(row, ["request_text", "text", "message", "context", "notes", "note", "reason"]);
    const item =
      pick(row, ["item_description", "item", "description", "product"]) ||
      (type ? type.replace(/_/g, " ") : "") ||
      "this purchase";
    const allowsPartial = parseBoolean(
      pick(row, ["allows_partial_payment", "partial_payment_allowed", "partial_allowed", "allow_partial"], ""),
    );
    return {
      request_id: pick(row, ["request_id", "id", "requestid"], `request_${index + 1}`),
      user_id: pick(row, ["user_id", "userid", "user"], `user_${index + 1}`),
      amount: num(
        pick(
          row,
          ["requested_amount", "amount_requested", "amount", "price", "value", "cost"],
          "0",
        ),
      ),
      currency: currency(row),
      item_description: item,
      context: text,
      ...(allowsPartial !== undefined ? { allows_partial_payment: allowsPartial } : {}),
    };
  });
}

/** financial_profiles.csv (also accepts a legacy users.csv). */
export function toUsers(rows: Raw[]): FinUser[] {
  return rows.map((row, index) => ({
    user_id: pick(row, ["user_id", "userid", "id", "profile_id"], `user_${index + 1}`),
    name: pick(row, ["name", "full_name", "user_name"]),
    currency: currency(row),
    balance: num(
      pick(row, ["balance", "current_balance", "account_balance", "available_balance"], "0"),
    ),
    monthly_income: num(pick(row, ["monthly_income", "income", "salary"], "0")),
    monthly_essentials: num(
      pick(
        row,
        ["monthly_essentials", "essentials", "essential_expenses", "monthly_expenses", "expenses"],
        "0",
      ),
    ),
    preferred_min_balance: num(
      pick(
        row,
        ["preferred_min_balance", "min_balance", "minimum_balance", "safety_buffer", "buffer"],
        "0",
      ),
    ),
    preferences: {},
  }));
}

/** financial_events.csv (also accepts a legacy transactions.csv). */
export function toTransactions(rows: Raw[]): TransactionRow[] {
  return rows.map((row) => {
    const description = pick(row, ["description", "merchant", "note", "details", "event_name"]);
    const category = pick(row, ["category", "event_type", "merchant", "tag"], "other").toLowerCase();
    return {
      user_id: pick(row, ["user_id", "userid", "user"]),
      amount: num(pick(row, ["amount", "value", "event_amount"], "0")),
      currency: currency(row),
      type: pick(row, ["type", "direction", "flow"], "expense").toLowerCase(),
      status: pick(row, ["status", "state"], "completed").toLowerCase(),
      category,
      date: pick(row, ["date", "event_date", "txn_date", "created_at"]),
      ...(description ? { description } : {}),
    };
  });
}

/** exchange_rates.csv — rate expressed as INR per one unit of the currency. */
export function toExchangeRates(rows: Raw[]): ExchangeRateRow[] {
  return rows.map((row) => {
    const code = currency(row, "INR");
    const direct = num(
      pick(row, ["rate_to_inr", "inr_rate", "to_inr", "rate_in_inr", "value_in_inr"], "0"),
    );
    if (direct > 0) return { currency: code, rate_to_inr: direct };
    // Some files express the rate the other way round (units per INR).
    const inverse = num(pick(row, ["rate_from_inr", "inr_to_currency", "per_inr"], "0"));
    if (inverse > 0) return { currency: code, rate_to_inr: 1 / inverse };
    const generic = num(pick(row, ["rate", "exchange_rate", "conversion_rate"], "0"));
    return { currency: code, rate_to_inr: generic > 0 ? generic : 1 };
  });
}

export function toPaymentOptions(rows: Raw[]): PaymentOptionRow[] {
  return rows.map((row, index) => {
    const partial = parseBoolean(
      pick(row, ["allows_partial_payment", "partial_payment_allowed", "allow_partial"], ""),
    );
    const installments = parseBoolean(
      pick(row, ["allows_installments", "installments_allowed", "allow_installments", "emi_allowed"], ""),
    );
    return {
      request_id: pick(row, ["request_id", "id"], `request_${index + 1}`),
      allows_partial_payment: partial ?? true,
      allows_installments: installments ?? partial ?? true,
      max_installments: Math.round(
        num(pick(row, ["max_installments", "max_emi_months", "installment_limit"], "12")),
      ),
    };
  });
}

export function toMessages(rows: Raw[]): MessageRow[] {
  return rows.map((row) => ({
    user_id: pick(row, ["user_id", "userid", "user"]),
    request_id: pick(row, ["request_id", "id"]),
    text: pick(row, ["message", "text", "message_text", "content", "body"]),
    currency: currency(row),
    date: pick(row, ["date", "sent_at", "created_at", "timestamp"]),
  }));
}

export function toImages(rows: Raw[]): ImageRow[] {
  return rows.map((row) => ({
    request_id: pick(row, ["request_id", "id"]),
    user_id: pick(row, ["user_id", "userid", "user"]),
    filename: pick(row, ["filename", "file", "image", "image_path", "path"]),
    extracted_text: pick(row, ["extracted_text", "ocr_text", "caption", "description", "text"]),
    currency: currency(row),
  }));
}

export function countRows(rows: Raw[]): number {
  return rows.length;
}
