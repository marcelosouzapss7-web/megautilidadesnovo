import { describe, expect, it } from "bun:test";
import {
  analyzeAdminDebugJson,
  clearAdminDebugEvents,
  emitAdminDebugEvent,
  formatAdminDebugEvents,
  getAdminDebugEvents,
  subscribeAdminDebugEvents,
} from "./admin-debug-console.ts";

describe("admin debug console", () => {
  it("records load requests and response payloads for the current session", () => {
    clearAdminDebugEvents();
    emitAdminDebugEvent({
      source: "product-hashes",
      phase: "request",
      status: "info",
      message: "page requested",
      details: { afterId: null, pageSize: 500 },
    });
    emitAdminDebugEvent({
      source: "product-hashes",
      phase: "response",
      status: "success",
      message: "page loaded",
      details: { payload: [{ id: "1", product_hash: "sku", offer_hash: "offer" }] },
    });

    const events = getAdminDebugEvents();
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ phase: "request", status: "info" });
    expect(events[1].details).toEqual({
      payload: [{ id: "1", product_hash: "sku", offer_hash: "offer" }],
    });
    expect(JSON.parse(formatAdminDebugEvents(events))).toHaveLength(2);
  });

  it("notifies subscribers and clears captured events", () => {
    clearAdminDebugEvents();
    let updates = 0;
    const unsubscribe = subscribeAdminDebugEvents(() => updates++);
    emitAdminDebugEvent({ source: "api", phase: "response", status: "error", message: "failed" });
    expect(updates).toBe(1);
    expect(getAdminDebugEvents()[0].status).toBe("error");
    clearAdminDebugEvents();
    expect(updates).toBe(2);
    expect(getAdminDebugEvents()).toEqual([]);
    unsubscribe();
  });

  it("formats valid pasted JSON and rejects invalid or empty input", () => {
    expect(analyzeAdminDebugJson('{"ok":true}')).toEqual({
      status: "success",
      formatted: '{\n  "ok": true\n}',
    });
    expect(analyzeAdminDebugJson("not json")).toEqual({ status: "error", reason: "invalid_json" });
    expect(analyzeAdminDebugJson("  ")).toEqual({ status: "error", reason: "empty" });
  });
});
