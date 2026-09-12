import { supabase } from "@/integrations/supabase/client";
import type {
  EnrichedResult,
  FinUser,
  MediaAnalysisRow,
  RequestRow,
  TransactionRow,
} from "./types";

export async function persistAnalysis(input: {
  ownerId: string;
  requests: RequestRow[];
  users: FinUser[];
  transactions: TransactionRow[];
  results: EnrichedResult[];
  media: MediaAnalysisRow[];
  logs: { time: string; text: string }[];
}) {
  const { ownerId } = input;

  if (input.users.length) {
    await supabase.from("fin_users").upsert(
      input.users.map((u) => ({
        owner_id: ownerId,
        user_id: u.user_id,
        name: u.name,
        balance: u.balance,
        monthly_income: u.monthly_income,
        monthly_essentials: u.monthly_essentials,
        preferred_min_balance: u.preferred_min_balance,
        preferences: u.preferences as never,
      })),
      { onConflict: "owner_id,user_id" },
    );
  }

  if (input.requests.length) {
    await supabase.from("requests").upsert(
      input.requests.map((r) => ({
        owner_id: ownerId,
        request_id: r.request_id,
        user_id: r.user_id,
        amount: r.amount,
        item_description: r.item_description,
        context: r.context,
      })),
      { onConflict: "owner_id,request_id" },
    );
  }

  if (input.transactions.length) {
    await supabase.from("transactions").delete().eq("owner_id", ownerId);
    await supabase.from("transactions").insert(
      input.transactions.map((t) => ({
        owner_id: ownerId,
        user_id: t.user_id,
        amount: t.amount,
        type: t.type,
        status: t.status,
        category: t.category,
        date: t.date && /^\d{4}-\d{2}-\d{2}/.test(t.date) ? t.date.slice(0, 10) : null,
      })),
    );
  }

  if (input.results.length) {
    await supabase.from("results").upsert(
      input.results.map((r) => ({
        owner_id: ownerId,
        request_id: r.request_id,
        user_id: r.user_id,
        amount_requested: r.amount_requested,
        amount_safe_to_pay: Number(r.amount_safe_to_pay) || 0,
        affordability_status: r.affordability_status,
        recommended_payment_method: r.recommended_payment_method,
        payment_plan: r.payment_plan,
        earliest_date_for_full_payment: r.earliest_date_for_full_payment || null,
        spending_changes_needed: r.spending_changes_needed,
        decision_explanation: r.decision_explanation,
      })),
      { onConflict: "owner_id,request_id" },
    );
  }

  if (input.media.length) {
    await supabase.from("media_analysis").insert(
      input.media.map((m) => ({
        owner_id: ownerId,
        request_id: m.request_id,
        filename: m.filename,
        extracted_text: m.extracted_text,
        confidence: m.confidence,
      })),
    );
  }

  if (input.logs.length) {
    await supabase.from("chat_logs").insert(
      input.logs.slice(-400).map((l) => ({
        owner_id: ownerId,
        role: "assistant",
        message: `[${l.time}] ${l.text}`,
      })),
    );
  }
}

export async function loadStoredResults(ownerId: string): Promise<EnrichedResult[]> {
  const [{ data: results }, { data: requests }] = await Promise.all([
    supabase.from("results").select("*").eq("owner_id", ownerId).order("created_at"),
    supabase.from("requests").select("*").eq("owner_id", ownerId),
  ]);

  const byId = new Map((requests ?? []).map((r) => [r.request_id, r]));

  return (results ?? []).map((r) => {
    const req = byId.get(r.request_id);
    const plan = (r.payment_plan ?? "")
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [date, amount] = p.split(":");
        return { date: date ?? "", amount: Number(amount) || 0 };
      });
    return {
      request_id: r.request_id,
      user_id: r.user_id ?? "",
      amount_requested: Number(r.amount_requested ?? req?.amount ?? 0),
      item_description: req?.item_description ?? "",
      amount_safe_to_pay: String(r.amount_safe_to_pay ?? 0),
      affordability_status: r.affordability_status ?? "",
      recommended_payment_method: r.recommended_payment_method ?? "",
      payment_plan: r.payment_plan ?? "",
      earliest_date_for_full_payment: r.earliest_date_for_full_payment ?? "",
      spending_changes_needed: r.spending_changes_needed ?? "",
      decision_explanation: r.decision_explanation ?? "",
      installments: plan,
      spending_changes: (r.spending_changes_needed ?? "").split(";").map((s) => s.trim()).filter(Boolean),
      snapshot: {
        balance: 0,
        monthly_income: 0,
        monthly_essentials: 0,
        preferred_min_balance: 0,
        pending_payments: 0,
      },
    } satisfies EnrichedResult;
  });
}
