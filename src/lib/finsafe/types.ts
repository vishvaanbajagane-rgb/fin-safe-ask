export type AffordabilityStatus =
  | "affordable_now"
  | "affordable_with_plan"
  | "affordable_later"
  | "not_affordable";

export interface FinUser {
  user_id: string;
  name: string;
  balance: number;
  monthly_income: number;
  monthly_essentials: number;
  preferred_min_balance: number;
  preferences: Record<string, unknown>;
}

export interface RequestRow {
  request_id: string;
  user_id: string;
  amount: number;
  item_description: string;
  context: string;
}

export interface TransactionRow {
  user_id: string;
  amount: number;
  type: string;
  status: string;
  category: string;
  date: string;
}

export interface MediaFileMeta {
  filename: string;
  size: number;
  type: string;
  preview?: string;
}

export interface MediaAnalysisRow {
  request_id: string;
  filename: string;
  extracted_text: string;
  confidence: number;
}

/** Output schema — must match the uploaded output CSV exactly, in this order. */
export interface ResultRow {
  request_id: string;
  amount_safe_to_pay: string;
  affordability_status: string;
  recommended_payment_method: string;
  payment_plan: string;
  earliest_date_for_full_payment: string;
  spending_changes_needed: string;
  decision_explanation: string;
}

export const OUTPUT_COLUMNS: (keyof ResultRow)[] = [
  "request_id",
  "amount_safe_to_pay",
  "affordability_status",
  "recommended_payment_method",
  "payment_plan",
  "earliest_date_for_full_payment",
  "spending_changes_needed",
  "decision_explanation",
];

export interface EnrichedResult extends ResultRow {
  user_id: string;
  amount_requested: number;
  item_description: string;
  installments: { date: string; amount: number }[];
  spending_changes: string[];
  snapshot: {
    balance: number;
    monthly_income: number;
    monthly_essentials: number;
    preferred_min_balance: number;
    pending_payments: number;
  };
}

export interface AnalysisConfig {
  useVlm: boolean;
  useLlm: boolean;
  model: string;
  forecastDays: number;
  matchUploadedSchema: boolean;
}

export interface LogLine {
  time: string;
  text: string;
}
