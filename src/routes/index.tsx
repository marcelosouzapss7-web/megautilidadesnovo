import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { useQuery } from "@tanstack/react-query";
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

const frases = [
  "Compre no site e retire em loja!* Consulte condições! *Apenas em São Paulo (Capital)",
  "Parcelamos em até 6x sem juros",
  "Entregamos em todo Brasil",
];

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Index() {
  const { data: produtos = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("position", { ascending: true }).order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="min-h-screen bg-muted" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <div className="mx-auto min-h-screen max-w-md bg-background">
        <div className="overflow-hidden bg-primary py-1.5 text-primary-foreground">
          <div className="animate-marquee flex w-max whitespace-nowrap text-xs font-semibold uppercase">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0" aria-hidden={k === 1}>
                {frases.map((f) => (
                  <span key={f} className="flex items-center">
                    <span className="px-4">{f}</span>
                    <span>★</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <StoreHeader />

        <main className="px-3 pb-10">
          <h1 className="py-5 text-center text-3xl text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            NOSSOS PRODUTOS
          </h1>
          <div className="grid grid-cols-2 gap-3">
            {produtos.map((p) => (
              <Link key={p.id} to="/produto/$id" params={{ id: p.id }} className="block">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="aspect-[3/4] w-full bg-muted" />
                )}
                <p className="mt-2 text-[13px] font-medium leading-snug text-foreground">{p.name}</p>
                <p className="mt-1 text-base font-bold text-primary">{brl(p.price)}</p>
              </Link>
            ))}
          </div>
          {produtos.length === 0 && <p className="text-center text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>}
        </main>
        <StoreFooter />
      </div>
    </div>
  );
}
