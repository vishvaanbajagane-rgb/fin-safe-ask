import Papa from "papaparse";
import type { FinUser, RequestRow, TransactionRow } from "./types";

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
      item_description: item,
      context: text,
      allows_partial_payment: parseBoolean(pick(row, ["allows_partial_payment", "partial_payment_allowed", "partial_allowed", "allow_partial"], "")),
    };
  });
}

export function toUsers(rows: Raw[]): FinUser[] {
  return rows.map((row, index) => ({
    user_id: pick(row, ["user_id", "userid", "id"], `user_${index + 1}`),
    name: pick(row, ["name", "full_name", "user_name"]),
    balance: num(pick(row, ["balance", "current_balance", "account_balance"], "0")),
    monthly_income: num(pick(row, ["monthly_income", "income", "salary"], "0")),
    monthly_essentials: num(
      pick(row, ["monthly_essentials", "essentials", "essential_expenses", "expenses"], "0"),
    ),
    preferred_min_balance: num(
      pick(row, ["preferred_min_balance", "min_balance", "minimum_balance", "buffer"], "0"),
    ),
    preferences: {},
  }));
}

export function toTransactions(rows: Raw[]): TransactionRow[] {
  return rows.map((row) => ({
    user_id: pick(row, ["user_id", "userid", "user"]),
    amount: num(pick(row, ["amount", "value"], "0")),
    type: pick(row, ["type", "direction"], "expense").toLowerCase(),
    status: pick(row, ["status", "state"], "completed").toLowerCase(),
    category: pick(row, ["category", "merchant", "tag"], "other").toLowerCase(),
    date: pick(row, ["date", "txn_date", "created_at"]),
  }));
}

export function countRows(rows: Raw[]): number {
  return rows.length;
}
