import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { cart, useCart } from "@/lib/cart";
import { useEffect, useRef, useState } from "react";

const PRODUTOS_POR_ETAPA = 10;

const produtosQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => (await supabase.from("products").select("id,name,price,old_price,has_sizes,position,created_at,image_url:id").order("position", { ascending: true }).order("created_at", { ascending: false })).data ?? [],
});

const settingsQuery = queryOptions({
  queryKey: ["site_settings"],
  queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(produtosQuery);
    return context.queryClient.ensureQueryData(settingsQuery);
  },
  head: () => ({
    meta: [
      { title: "MEGA SHOPPING — Nossos Produtos" },
      { name: "description", content: "Confira os produtos do MEGA SHOPPING com os melhores preços." },
      { property: "og:title", content: "MEGA SHOPPING — Nossos Produtos" },
      { property: "og:description", content: "Confira os produtos do MEGA SHOPPING com os melhores preços." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://megashoppingribeirao.shop/__l5e/assets-v1/facd7641-e4ec-4823-a137-10a0de2f40e6/og-compartilhar.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://megashoppingribeirao.shop/__l5e/assets-v1/facd7641-e4ec-4823-a137-10a0de2f40e6/og-compartilhar.png" },
    ],
  }),
  pendingMs: 0,
  pendingComponent: () => (
    <div className="grid min-h-[60vh] place-items-center">
      <span
        aria-label="Carregando produtos"
        className="size-9 animate-spin rounded-full border-4 border-muted-foreground/25 border-t-primary"
      />
    </div>
  ),
  component: Index,
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Index() {
  const itens = useCart().items;
  const { data: produtos = [], isPending: produtosCarregando } = useQuery(produtosQuery);
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const hero = (settings as any)?.hero_image_url as string | undefined;
  const [entradaConcluida, setEntradaConcluida] = useState(false);
  const [quantidadeVisivel, setQuantidadeVisivel] = useState(PRODUTOS_POR_ETAPA);
  const [proximoDoFim, setProximoDoFim] = useState(false);
  const sentinelaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (produtosCarregando) return;
    const timer = window.setTimeout(() => setEntradaConcluida(true), 500);
    return () => window.clearTimeout(timer);
  }, [produtosCarregando]);

  useEffect(() => {
    const sentinela = sentinelaRef.current;
    if (!sentinela) return;

    const observer = new IntersectionObserver(
      ([entrada]) => setProximoDoFim(Boolean(entrada?.isIntersecting)),
      { rootMargin: "240px 0px" },
    );
    observer.observe(sentinela);
    return () => observer.disconnect();
  }, [entradaConcluida]);

  useEffect(() => {
    if (!proximoDoFim || quantidadeVisivel >= produtos.length) return;
    const timer = window.setTimeout(() => {
      setQuantidadeVisivel((atual) => Math.min(atual + PRODUTOS_POR_ETAPA, produtos.length));
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [proximoDoFim, quantidadeVisivel, produtos.length]);

  function irParaProdutos() {
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
  }

  if (!entradaConcluida) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3">
          <span
            aria-label="Carregando produtos"
            className="size-8 animate-spin rounded-full border-4 border-muted-foreground/25 border-t-primary"
          />
          <p className="text-sm text-muted-foreground">Carregando produtos, por favor aguarde</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <div className="mx-auto min-h-screen max-w-md bg-background">
        <StoreHeader />

        {hero && (
          <section className="relative bg-background px-[15px] pb-1 pt-3">
            <img src={hero} alt="Promoção da loja" className="block aspect-[4/5] w-full object-contain object-top" />
            <div className="absolute inset-x-[15px] bottom-3 pl-4">
              <div className="inline-block bg-[#e31c24] px-3 py-1">
                <span className="text-sm font-extrabold uppercase tracking-tight text-white">Até 50% OFF</span>
              </div>
              <button
                onClick={irParaProdutos}
                className="animate-blink-3s ml-0 mt-2 block rounded bg-header px-5 py-1.5 text-xs font-bold text-header-foreground shadow-md"
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
            {produtos.slice(0, quantidadeVisivel).map((p, idx) => {
              const k = itens.findIndex((i) => i.id === p.id && i.size === null && i.image === ((p.image_url ? `/api/public/img/${p.id}` : null)));
              const q = itens[k]?.qty ?? 0;
              return (
              <div key={p.id}>
              <Link to="/produto/$id" params={{ id: p.id }} className="block">
                {p.image_url ? (
                  <img src={`/api/public/img/${p.id}`} alt={p.name} loading={idx < 4 ? "eager" : "lazy"} fetchPriority={idx < 2 ? "high" : "auto"} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="aspect-[3/4] w-full bg-muted" />
                )}
                <p className="mt-2 text-[13px] font-medium leading-snug text-foreground">{p.name}</p>
                <p className="mt-1 text-base font-bold text-primary">{brl(p.price)}</p>
              </Link>
              {q === 0 ? (
                <button onClick={() => cart.add({ id: p.id, name: p.name, price: Number(p.price), image: (p.image_url ? `/api/public/img/${p.id}` : null), size: null })}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-header py-2 text-xs font-bold text-header-foreground">
                  <ShoppingCart className="size-4" /> ADICIONAR
                </button>
              ) : (
                <div className="mt-2 flex items-center justify-between rounded border border-header-foreground">
                  <button aria-label="Diminuir" onClick={() => (q <= 1 ? cart.remove(k) : cart.setQty(k, q - 1))} className="grid size-9 place-items-center text-header-foreground"><Minus className="size-4" /></button>
                  <span className="text-sm font-bold text-foreground">{q}</span>
                  <button aria-label="Aumentar" onClick={() => { cart.setQty(k, q + 1); cart.open(); }} className="grid size-9 place-items-center text-header-foreground"><Plus className="size-4" /></button>
                </div>
              )}
              </div>
              );
            })}
          </div>
          {quantidadeVisivel < produtos.length && (
            <div ref={sentinelaRef} className="flex min-h-20 items-center justify-center gap-2 py-6">
              {proximoDoFim && (
                <>
                  <span
                    aria-label="Carregando mais produtos"
                    className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
                  />
                  <p className="text-sm text-muted-foreground">Carregando mais produtos</p>
                </>
              )}
            </div>
          )}
          {produtos.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8">
              <span
                aria-label="Carregando"
                className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
              />
              <p className="text-sm text-muted-foreground">Carregando produtos, por favor aguarde</p>
            </div>
          )}
        </main>
        <StoreFooter />
      </div>
    </div>
  );
}
