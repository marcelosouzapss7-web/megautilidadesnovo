import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MEGA SHOPPING — Nossos Produtos" },
      { name: "description", content: "Confira os produtos do MEGA SHOPPING com os melhores preços." },
      { property: "og:title", content: "MEGA SHOPPING — Nossos Produtos" },
      { property: "og:description", content: "Confira os produtos do MEGA SHOPPING com os melhores preços." },
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
    queryFn: async () => (await supabase.from("products").select("*").order("position", { ascending: true }).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const hero = (settings as any)?.hero_image_url as string | undefined;

  function irParaProdutos() {
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-muted" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <div className="mx-auto min-h-screen max-w-md bg-background">
        <StoreHeader />

        {hero && (
          <section className="relative bg-background px-[15px] pb-1 pt-3">
            <img src={hero} alt="Promoção da loja" className="block aspect-[4/5] w-full object-contain object-top" />
            <div className="absolute inset-x-[15px] bottom-4">
              <div className="inline-block bg-[#e31c24] px-6 py-2.5">
                <span className="text-2xl font-extrabold uppercase tracking-tight text-white">Até 50% OFF</span>
              </div>
              <button
                onClick={irParaProdutos}
                className="animate-blink-3s ml-2 mt-3 block rounded bg-header px-8 py-2.5 text-base font-bold text-header-foreground shadow-md"
              >
                Comprar agora
              </button>
            </div>
          </section>
        )}

        <main id="produtos" className="px-3 pb-10">
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
