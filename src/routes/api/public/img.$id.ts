import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Serve a foto principal do produto como arquivo de imagem (com cache), em vez de base64 na lista.
export const Route = createFileRoute("/api/public/img/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("Bad id", { status: 400 });
        const env = import.meta.env as Record<string, string | undefined>;
        const url = process.env["SUPABASE_URL"] ?? env["VITE_SUPABASE_URL"] ?? "";
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";
        const sb = createClient(url, key, { auth: { persistSession: false } });
        const { data } = await sb.from("products").select("image_url").eq("id", params.id).maybeSingle();
        const src = data?.image_url;
        if (!src) return new Response("Not found", { status: 404 });
        const m = /^data:([^;]+);base64,(.*)$/s.exec(src);
        if (!m) return Response.redirect(src, 302);
        const bin = Uint8Array.from(atob(m[2]!), (c) => c.charCodeAt(0));
        return new Response(bin, {
          headers: { "Content-Type": m[1]!, "Cache-Control": "public, max-age=600, stale-while-revalidate=86400" },
        });
      },
    },
  },
});
