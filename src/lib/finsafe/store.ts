import { useSyncExternalStore } from "react";
import type {
  AnalysisConfig,
  EnrichedResult,
  FinUser,
  LogLine,
  MediaAnalysisRow,
  MediaFileMeta,
  RequestRow,
  TransactionRow,
} from "./types";

export interface FileMeta {
  name: string;
  size: number;
  rows: number;
}

export interface FinSafeState {
  requests: RequestRow[];
  users: FinUser[];
  transactions: TransactionRow[];
  media: MediaFileMeta[];
  mediaAnalysis: MediaAnalysisRow[];
  files: { requests?: FileMeta; users?: FileMeta; transactions?: FileMeta };
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

let state: FinSafeState = initial;
const listeners = new Set<() => void>();

function emit() {
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
