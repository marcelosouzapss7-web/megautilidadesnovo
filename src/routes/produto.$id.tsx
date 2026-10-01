import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { cart } from "@/lib/cart";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [
      { title: "Produto — MEGA SHOPPING" },
      { name: "description", content: "Veja detalhes, tamanhos e preço do produto no MEGA SHOPPING." },
      { property: "og:title", content: "Produto — MEGA SHOPPING" },
      { property: "og:description", content: "Veja detalhes, tamanhos e preço do produto no MEGA SHOPPING." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Produto,
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const bebas = { fontFamily: "'Bebas Neue', sans-serif" };

function Produto() {
  const { id } = Route.useParams();
  const [tam, setTam] = useState<string | null>(null);
  const [aviso, setAviso] = useState(false);
  const [cep, setCep] = useState("");
  const [foto, setFoto] = useState(0);
  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => (await supabase.from("products").select("*").eq("id", id).maybeSingle()).data,
  });

  return (
    <div className="min-h-screen bg-muted" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <div className="mx-auto min-h-screen max-w-md bg-background">
        <StoreHeader />
        {isLoading ? null : !p ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Produto não encontrado.</p>
        ) : (
          <main className="px-3 pb-10">
            <p className="pt-4 text-center text-xs text-muted-foreground">REF: {p.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="px-2 pb-4 text-center text-3xl leading-tight text-foreground" style={bebas}>{p.name}</h1>
            <Galeria imgs={p.images?.length ? p.images : p.image_url ? [p.image_url] : []} alt={p.name} onPick={setFoto} />
            {p.has_sizes !== false && (
            <div className="mt-6 rounded-xl border bg-muted/50 p-3">
              <p className="mb-2 text-sm text-foreground">Tamanho</p>
              <div className="flex gap-2">
                {["P", "M", "G", "GG"].map((t) => (
                  <button key={t} onClick={() => setTam(t)}
                    className={`grid h-11 w-11 place-items-center rounded-full border bg-background font-serif text-sm ${tam === t ? "border-primary text-primary border-2" : "text-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            )}
            <div className="mt-8 text-center">
              {p.old_price != null && Number(p.old_price) > Number(p.price) && (
                <p className="text-lg text-muted-foreground" style={bebas}>DE: <span className="line-through">{brl(Number(p.old_price))}</span></p>
              )}
              <p className="text-5xl text-primary" style={bebas}>{brl(p.price)}</p>
              <p className="text-lg text-foreground" style={bebas}>OU 6X DE <b>{brl(Math.floor((Number(p.price) / 6) * 100) / 100)}</b></p>
              {p.old_price != null && Number(p.old_price) > Number(p.price) && (
                <span className="mt-1 inline-block rounded-full border px-4 py-1 text-sm text-muted-foreground" style={bebas}>ECONOMIA DE {brl(Number(p.old_price) - Number(p.price))}</span>
              )}
              <button
                onClick={() => {
                  if (p.has_sizes !== false && !tam) { setAviso(true); return; }
                  setAviso(false);
                  const fotos: string[] = p.images?.length ? p.images : p.image_url ? [p.image_url] : [];
                  cart.add({ id: p.id, name: p.name, price: Number(p.price), image: fotos[foto] ?? fotos[0] ?? null, size: p.has_sizes === false ? null : tam });
                }}
                className="mt-5 w-48 rounded-full bg-[hsl(85_75%_42%)] py-3 font-serif font-bold text-primary-foreground">COMPRAR</button>
              {aviso && <p className="mt-2 text-sm text-destructive">Escolha um tamanho antes de comprar.</p>}
              <p className="mt-6 text-sm text-foreground">Calcule o frete e prazo de entrega.</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="flex">
                  <input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000"
                    className="h-10 w-32 border px-3 text-sm" />
                  <button className="h-10 bg-foreground px-3 font-extrabold text-background">OK</button>
                </div>
                <a href="https://buscacepinter.correios.com.br" target="_blank" rel="noreferrer" className="text-xs font-semibold underline">Não sei meu CEP</a>
              </div>
            </div>
            {p.description && (
              <div className="mt-12 text-muted-foreground">
                <p className="text-base">Descrição</p>
                <p className="whitespace-pre-line text-base leading-relaxed">{p.description}</p>
              </div>
            )}
          </main>
        )}
        <StoreFooter />
      </div>
    </div>
  );
}

function Galeria({ imgs, alt, onPick }: { imgs: string[]; alt: string; onPick: (k: number) => void }) {
  const [i, setI] = useState(0);
  const [tocou, setTocou] = useState(false);
  useEffect(() => { if (i < 3) onPick(i); }, [i]);
  useEffect(() => {
    if (imgs.length < 2 || tocou) return;
    const t = setTimeout(() => setI((v) => (v === 0 ? 1 : v)), 3000);
    return () => clearTimeout(t);
  }, [imgs.length, tocou]);
  const [x0, setX0] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  if (!imgs.length) return <div className="aspect-square w-full bg-muted" />;
  const ir = (d: number) => { setTocou(true); setI((v) => Math.min(imgs.length - 1, Math.max(0, v + d))); };
  return (
    <div>
      <div className="overflow-hidden touch-pan-y"
        onTouchStart={(e) => setX0(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (x0 === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? x0) - x0;
          setX0(null);
          if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1); else setZoom(true);
        }}
        onClick={(e) => { if (e.detail && !("ontouchstart" in window)) setZoom(true); }}>
        <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {imgs.map((src, k) => (
            <img key={k} src={src} alt={`${alt} ${k + 1}`} draggable={false} className="w-full shrink-0 cursor-zoom-in object-cover" />
          ))}
        </div>
      </div>
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90" onClick={() => setZoom(false)}>
          <button aria-label="Fechar" className="absolute right-4 top-4 text-3xl text-background">✕</button>
          {i > 0 && <button aria-label="Anterior" onClick={(e) => { e.stopPropagation(); ir(-1); }} className="absolute left-2 text-4xl text-background">‹</button>}
          <img src={imgs[i]} alt={alt} className="max-h-[90vh] max-w-full object-contain" onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => setX0(e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => { if (x0 === null) return; const dx = (e.changedTouches[0]?.clientX ?? x0) - x0; setX0(null); if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1); }} />
          {i < imgs.length - 1 && <button aria-label="Próxima" onClick={(e) => { e.stopPropagation(); ir(1); }} className="absolute right-2 text-4xl text-background">›</button>}
        </div>
      )}
      {imgs.length > 1 && (
        <div className="mt-3 flex justify-center gap-3">
          {imgs.map((src, k) => (
            <button key={k} aria-label={`Foto ${k + 1}`} onClick={() => { setTocou(true); setI(k); }}
              className={`h-12 w-12 overflow-hidden rounded-full border-2 p-0.5 ${k === i ? "border-primary" : "border-transparent"}`}>
              <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
