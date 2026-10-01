import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [
      { title: "Produto — Mercado Shopping" },
      { name: "description", content: "Veja detalhes, tamanhos e preço do produto no Mercado Shopping." },
      { property: "og:title", content: "Produto — Mercado Shopping" },
      { property: "og:description", content: "Veja detalhes, tamanhos e preço do produto no Mercado Shopping." },
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
  const [cep, setCep] = useState("");
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
            <Galeria imgs={p.images?.length ? p.images : p.image_url ? [p.image_url] : []} alt={p.name} />
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
            <div className="mt-8 text-center">
              <p className="text-5xl text-primary" style={bebas}>{brl(p.price)}</p>
              <p className="text-lg text-foreground" style={bebas}>OU 3X DE {brl(p.price / 3)}</p>
              <button className="mt-5 w-48 rounded-full bg-[hsl(85_75%_42%)] py-3 font-serif font-bold text-primary-foreground">COMPRAR</button>
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

function Galeria({ imgs, alt }: { imgs: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const giro = Math.min(imgs.length, 3);
  const demo = i === 3;
  useEffect(() => {
    if (giro < 2 || demo) return;
    const t = setInterval(() => setI((v) => (v + 1) % giro), 3000);
    return () => clearInterval(t);
  }, [giro, demo]);
  if (!imgs.length) return <div className="aspect-square w-full bg-muted" />;
  return (
    <div>
      <div className="overflow-hidden">
        <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {imgs.map((src, k) => (
            <img key={k} src={src} alt={`${alt} ${k + 1}`} className="w-full shrink-0 object-cover" />
          ))}
        </div>
      </div>
      {imgs.length > 1 && (
        <div className="mt-3 flex justify-center gap-3">
          {imgs.map((src, k) => (
            <button key={k} aria-label={`Foto ${k + 1}`} onClick={() => setI(k)}
              className={`h-12 w-12 overflow-hidden rounded-full border-2 p-0.5 ${k === i ? "border-primary" : "border-transparent"}`}>
              <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
