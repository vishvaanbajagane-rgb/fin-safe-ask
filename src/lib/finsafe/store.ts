import { useSyncExternalStore } from "react";
import type {
  AnalysisConfig,
  EnrichedResult,
  ExchangeRateRow,
  FinUser,
  ImageRow,
  LogLine,
  MediaAnalysisRow,
  MediaFileMeta,
  MessageRow,
  PaymentOptionRow,
  RequestRow,
  TransactionRow,
} from "./types";

export interface FileMeta {
  name: string;
  size: number;
  rows: number;
}

export type FileKind =
  | "requests"
  | "users"
  | "transactions"
  | "rates"
  | "paymentOptions"
  | "messages"
  | "images";

export interface FinSafeState {
  requests: RequestRow[];
  users: FinUser[];
  transactions: TransactionRow[];
  rates: ExchangeRateRow[];
  paymentOptions: PaymentOptionRow[];
  messages: MessageRow[];
  images: ImageRow[];
  media: MediaFileMeta[];
  mediaAnalysis: MediaAnalysisRow[];
  files: Partial<Record<FileKind, FileMeta>>;
  config: AnalysisConfig;
  results: EnrichedResult[];
  logs: LogLine[];
  progress: number;
  running: boolean;
  startedAt: number | null;
  stats: { llmCalls: number; vlmCalls: number; avgMs: number; errors: number };
}

const initial: FinSafeState = {
  requests: [],
  users: [],
  transactions: [],
  rates: [],
  paymentOptions: [],
  messages: [],
  images: [],
  media: [],
  mediaAnalysis: [],
  files: {},
  config: {
    useVlm: true,
    useLlm: true,
    model: "Gemini 2.0",
    forecastDays: 90,
    matchUploadedSchema: true,
  },
  results: [],
  logs: [],
  progress: 0,
  running: false,
  startedAt: null,
  stats: { llmCalls: 0, vlmCalls: 0, avgMs: 0, errors: 0 },
};

const CACHE_KEY = "finsafe:results";

function readCache(): Partial<FinSafeState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Partial<FinSafeState>) : {};
  } catch {
    return {};
  }
}

function writeCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ results: state.results, requests: state.requests }),
    );
  } catch {
    /* storage full or unavailable — in-memory results still work */
  }
}

let state: FinSafeState = { ...initial, ...readCache() };
const listeners = new Set<() => void>();

function emit() {
  writeCache();
  listeners.forEach((l) => l());
}

export const finsafe = {
  get(): FinSafeState {
    return state;
  },
  set(patch: Partial<FinSafeState>) {
    state = { ...state, ...patch };
    emit();
  },
  log(text: string) {
    const time = new Date().toTimeString().slice(0, 8);
    state = { ...state, logs: [...state.logs, { time, text }] };
    emit();
  },
  reset() {
    state = { ...initial, config: state.config };
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useFinSafe(): FinSafeState {
  return useSyncExternalStore(
    finsafe.subscribe,
    () => state,
    () => initial,
  );
}

export function logText(logs: LogLine[]): string {
  return logs.map((l) => `[${l.time}] ${l.text}`).join("\n");
}
