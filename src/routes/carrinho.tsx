import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { cart, useCart } from "@/lib/cart";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Meu Carrinho — MEGA SHOPPING" },
      { name: "description", content: "Revise seus produtos, calcule a entrega e feche seu pedido no MEGA SHOPPING." },
      { property: "og:title", content: "Meu Carrinho — MEGA SHOPPING" },
      { property: "og:description", content: "Revise seus produtos, calcule a entrega e feche seu pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Carrinho,
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function Etapas({ etapa = 2 }: { etapa?: number }) {
  const nomes = ["1.Carrinho", "2.Pagamento", "3.Confirmação"];
  return (
    <div className="px-5 pb-5 pt-4">
      <div className="relative mx-3 h-2">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-muted" />
        <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded bg-primary/50" style={{ width: etapa >= 3 ? "100%" : "50%" }} />
        {[0, 50, 100].map((l) => (
          <span key={l} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/60" style={{ left: `${l}%` }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        {nomes.map((n) => <span key={n}>{n}</span>)}
      </div>
    </div>
  );
}

function Carrinho() {
  const { items } = useCart();
  const [cupom, setCupom] = useState("");
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="min-h-screen bg-muted" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <div className="mx-auto min-h-screen max-w-md bg-muted">
        <StoreHeader />
        <div className="bg-background shadow-sm"><Etapas /></div>

        <div className="p-2">
          <h1 className="mx-4 mt-4 border-b-2 border-muted-foreground/40 pb-2 text-xl text-foreground">Meu Carrinho</h1>

          <div className="mt-5 space-y-3">
            {items.length === 0 && (
              <p className="bg-background p-6 text-center text-sm text-muted-foreground">Seu carrinho está vazio.</p>
            )}
            {items.map((it, k) => (
              <div key={k} className="flex gap-4 bg-background p-4 shadow-sm">
                {it.image ? <img src={it.image} alt={it.name} className="h-32 w-[88px] object-cover" /> : <div className="h-32 w-[88px] bg-muted" />}
                <div className="flex-1">
                  <p className="text-sm leading-5 text-foreground">{it.name} {it.size}</p>
                  <p className="mt-2 text-xs font-bold italic text-foreground">MEGA SHOPPING</p>
                  <p className="text-lg font-bold text-foreground">{brl(it.price * it.qty)}</p>
                  <button onClick={() => cart.remove(k)} className="text-xs text-foreground underline">remover</button>
                </div>
                <div className="flex flex-col gap-2">
                  <button aria-label="Aumentar" onClick={() => cart.setQty(k, it.qty + 1)} className="h-10 w-10 rounded border text-lg">+</button>
                  <span className="grid h-10 w-10 place-items-center rounded border text-sm text-[hsl(110_40%_45%)]">{it.qty}</span>
                  <button aria-label="Diminuir" onClick={() => cart.setQty(k, it.qty - 1)} className="h-10 w-10 rounded border text-lg">-</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 bg-background p-4 shadow-sm">
            <h2 className="text-xl text-foreground">Entrega</h2>
            <p className="mt-1 text-sm text-foreground">Veja as opções de entrega para seus itens, com todos os prazos e valores.</p>
            <button className="mt-4 rounded border px-3 py-2 text-sm">CALCULAR</button>

            <div className="mx-2 mt-14 rounded border bg-muted p-3">
              <p className="text-xs font-bold text-foreground">CUPOM DE DESCONTO</p>
              <div className="mt-2 flex gap-2">
                <input value={cupom} onChange={(e) => setCupom(e.target.value)} placeholder="Código" className="min-w-0 flex-1 rounded border bg-background px-2 py-1.5 text-sm" />
                <button className="rounded bg-foreground px-3 text-sm text-background">Adicionar</button>
              </div>
            </div>

            <div className="mt-6 flex justify-between border-b px-10 py-4 text-sm">
              <span>Subtotal</span><span>{brl(total)}</span>
            </div>
            <div className="flex justify-between px-10 py-4 text-sm">
              <span>Total</span><span className="font-bold">{brl(total)}</span>
            </div>
          </div>

          <Link to="/" className="mt-4 inline-block bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">Escolher mais produtos</Link>
          <div className="mt-4 flex justify-end">
            {items.length === 0 ? (
              <button disabled className="bg-[hsl(130_50%_42%)] px-8 py-3 text-primary-foreground opacity-50">FECHAR PEDIDO</button>
            ) : (
              <Link to="/checkout" className="bg-[hsl(130_50%_42%)] px-8 py-3 text-primary-foreground">FECHAR PEDIDO</Link>
            )}
          </div>
        </div>
        <div className="mt-6"><StoreFooter /></div>
      </div>
    </div>
  );
}
