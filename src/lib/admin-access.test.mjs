import { describe, expect, it } from "bun:test";
import { checkAdminAccess } from "./admin-access.ts";

function createClient(results, refreshResult = { error: null }) {
  let calls = 0;
  let refreshes = 0;
  return {
    client: {
      rpc: async () => results[calls++],
      auth: {
        refreshSession: async () => {
          refreshes++;
          return refreshResult;
        },
      },
    },
    calls: () => calls,
    refreshes: () => refreshes,
  };
}

describe("admin access validation", () => {
  it("allows access only when the database confirms the role", async () => {
    const allowed = createClient([{ data: true, error: null }]);
    const denied = createClient([{ data: false, error: null }]);

    expect(await checkAdminAccess(allowed.client)).toBe(true);
    expect(await checkAdminAccess(denied.client)).toBe(false);
  });

  it("refreshes an expired JWT and retries the role check", async () => {
    const client = createClient([
      { data: null, error: { code: "PGRST301", message: "JWT expired" } },
      { data: true, error: null },
    ]);

    expect(await checkAdminAccess(client.client)).toBe(true);
    expect(client.refreshes()).toBe(1);
    expect(client.calls()).toBe(2);
  });

  it("keeps a failed validation distinct from a denied role", async () => {
    const error = { message: "network unavailable" };
    const client = createClient([{ data: false, error }]);

    await expect(checkAdminAccess(client.client)).rejects.toBe(error);
    expect(client.refreshes()).toBe(0);
  });

  it("does not retry when the session refresh fails", async () => {
    const refreshError = { message: "refresh token expired" };
    const client = createClient([{ data: null, error: { status: 401, message: "Invalid JWT" } }], {
      error: refreshError,
    });

    await expect(checkAdminAccess(client.client)).rejects.toBe(refreshError);
    expect(client.calls()).toBe(1);
  });
});
