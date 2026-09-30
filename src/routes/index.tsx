import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Star, User, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mercado Shopping — Nossos Produtos" },
      { name: "description", content: "Confira os produtos do Mercado Shopping com os melhores preços." },
      { property: "og:title", content: "Mercado Shopping — Nossos Produtos" },
      { property: "og:description", content: "Confira os produtos do Mercado Shopping com os melhores preços." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Index() {
  const { data: produtos = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: settings, isLoading } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });

  return (
    <div className="min-h-screen bg-muted" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <div className="mx-auto min-h-screen max-w-md bg-background">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-background px-3 py-3 shadow-sm">
          <div className="flex items-center gap-3 text-primary">
            <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M2 2h18M2 9h12M2 16h16" />
            </svg>
            <Search className="h-6 w-6" />
          </div>
          {isLoading ? (
            <div className="h-9 w-40" />
          ) : settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo da loja" className="h-10 max-w-[180px] object-contain" />
          ) : (
            <div className="flex flex-col items-end leading-none">
              <div className="flex items-center gap-1 text-primary">
                <Star className="h-5 w-5" strokeWidth={2.5} />
                <span className="text-lg font-extrabold tracking-tight">MERCADO SHOPPING</span>
              </div>
              <span className="text-[8px] italic text-muted-foreground">by Eder Barreira</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-primary">
            <User className="h-6 w-6" />
            <div className="relative">
              <ShoppingBag className="h-6 w-6" />
              <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">0</span>
            </div>
          </div>
        </header>

        <main className="px-3 pb-10">
          <h1 className="py-5 text-center text-3xl text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            NOSSOS PRODUTOS
          </h1>
          <div className="grid grid-cols-2 gap-3">
            {produtos.map((p) => (
              <a key={p.id} href="#" className="block">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="aspect-[3/4] w-full bg-muted" />
                )}
                <p className="mt-2 text-[13px] font-medium leading-snug text-foreground">{p.name}</p>
                <p className="mt-1 text-base font-bold text-primary">{brl(p.price)}</p>
              </a>
            ))}
          </div>
          {produtos.length === 0 && <p className="text-center text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>}
        </main>
      </div>
    </div>
  );
}
