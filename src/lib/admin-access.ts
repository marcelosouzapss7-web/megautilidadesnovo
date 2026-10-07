type RpcResult = { data: boolean | null; error: unknown };

export type AdminAccessClient = {
  rpc: (functionName: "is_product_admin") => PromiseLike<RpcResult>;
  auth: {
    refreshSession: () => Promise<{ error: unknown }>;
  };
};

function isSessionTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; status?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  return (
    candidate.status === 401 ||
    ["pgrst301", "pgrst302", "jwt_expired", "session_not_found"].includes(code) ||
    message.includes("jwt expired") ||
    message.includes("invalid jwt") ||
    message.includes("session not found")
  );
}

export async function checkAdminAccess(client: AdminAccessClient): Promise<boolean> {
  const firstResult = await client.rpc("is_product_admin");
  if (!firstResult.error) return firstResult.data === true;
  if (!isSessionTokenError(firstResult.error)) throw firstResult.error;

  const { error: refreshError } = await client.auth.refreshSession();
  if (refreshError) throw refreshError;

  const retryResult = await client.rpc("is_product_admin");
  if (retryResult.error) throw retryResult.error;
  return retryResult.data === true;
}

export async function resolveAdminAccess(client: AdminAccessClient) {
  try {
    return { access: await checkAdminAccess(client), error: false } as const;
  } catch {
    return { access: null, error: true } as const;
  }
}
