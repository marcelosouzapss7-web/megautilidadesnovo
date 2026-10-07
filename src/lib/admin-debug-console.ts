export type AdminDebugStatus = "info" | "success" | "error";

export type AdminDebugEvent = {
  id: number;
  timestamp: string;
  source: string;
  phase: string;
  status: AdminDebugStatus;
  message: string;
  details?: unknown;
};

type AdminDebugEventInput = Omit<AdminDebugEvent, "id" | "timestamp">;
type Listener = () => void;

const events: AdminDebugEvent[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

export function emitAdminDebugEvent(event: AdminDebugEventInput): void {
  events.push({ ...event, id: nextId++, timestamp: new Date().toISOString() });
  listeners.forEach((listener) => listener());
}

export function getAdminDebugEvents(): AdminDebugEvent[] {
  return [...events];
}

export function subscribeAdminDebugEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearAdminDebugEvents(): void {
  events.length = 0;
  listeners.forEach((listener) => listener());
}

export function formatAdminDebugEvents(items: AdminDebugEvent[]): string {
  return JSON.stringify(items, null, 2);
}

export function analyzeAdminDebugJson(
  input: string,
):
  { status: "success"; formatted: string } | { status: "error"; reason: "empty" | "invalid_json" } {
  if (!input.trim()) return { status: "error", reason: "empty" };
  try {
    return { status: "success", formatted: JSON.stringify(JSON.parse(input), null, 2) };
  } catch {
    return { status: "error", reason: "invalid_json" };
  }
}
