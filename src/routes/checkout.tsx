import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Etapas } from "./carrinho";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — Mercado Shopping" },
      { name: "description", content: "Informe seu e-mail para finalizar sua compra no Mercado Shopping." },
      { property: "og:title", content: "Finalizar compra — Mercado Shopping" },
      { property: "og:description", content: "Informe seu e-mail para finalizar sua compra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

const emailSchema = z.string().trim().email().max(255);

function Checkout() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  useEffect(() => { setEmail(localStorage.getItem("checkout_email") || ""); }, []);

  const continuar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = emailSchema.safeParse(email);
    if (!r.success) { setErro("Informe um e-mail válido."); return; }
    setErro("");
    localStorage.setItem("checkout_email", r.data);
    setOk(true);
  };

  const itens = ["Identificar seu perfil", "Notificar sobre o andamento do seu pedido", "Gerenciar seu histórico de compras", "Acelerar o preenchimento de suas informações"];

  return (
    <div className="min-h-screen bg-muted" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <div className="mx-auto min-h-screen max-w-md bg-muted">
        <StoreHeader />
        <div className="bg-background shadow-sm"><Etapas etapa={3} /></div>
        <div className="p-2">
          <h1 className="mt-4 border-b-2 border-muted-foreground/40 pb-2 text-xl text-foreground">Finalizar compra</h1>
          <div className="mt-5 bg-background px-3 pb-20 pt-6 shadow-sm">
            <div className="text-right"><Link to="/carrinho" className="text-sm text-foreground">Voltar para o carrinho</Link></div>
            <p className="mt-6 text-center text-lg text-foreground">Para finalizar a compra, informe seu e-mail.</p>
            <form onSubmit={continuar} className="mt-4 flex gap-2">
              <input type="email" value={email} maxLength={255} onChange={(e) => { setEmail(e.target.value); setOk(false); }} placeholder="seu@email.com" className="min-w-0 flex-1 rounded border px-3 py-3 text-base" />
              <button className="rounded bg-primary px-4 text-xl text-primary-foreground">Continuar</button>
            </form>
            {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
            {ok && <p className="mt-2 text-sm text-[hsl(130_50%_35%)]">E-mail salvo: {email}</p>}
            <p className="mt-12 text-center text-foreground">Usamos seu e-mail de forma 100% segura para:</p>
            <ul className="mt-2 space-y-1 text-center text-sm text-foreground">
              {itens.map((t) => <li key={t}><span className="text-[hsl(30_80%_60%)]">✓</span> {t}</li>)}
            </ul>
          </div>
        </div>
        <div className="mt-10"><StoreFooter /></div>
      </div>
    </div>
  );
}
