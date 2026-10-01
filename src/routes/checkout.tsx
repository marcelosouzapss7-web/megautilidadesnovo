import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { useCart } from "@/lib/cart";
import { Etapas } from "./carrinho";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — Mercado Shopping" },
      { name: "description", content: "Informe seus dados para finalizar sua compra no Mercado Shopping." },
      { property: "og:title", content: "Finalizar compra — Mercado Shopping" },
      { property: "og:description", content: "Informe seus dados para finalizar sua compra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

const emailSchema = z.string().trim().email().max(255);
const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const inp = "w-full rounded border px-3 py-2.5 text-base";

function Checkout() {
  const { items } = useCart();
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [d, setD] = useState({ nome: "", sobrenome: "", cpf: "", telefone: "" });
  const [salvar, setSalvar] = useState(false);
  const [cupom, setCupom] = useState("");

  useEffect(() => {
    setEmail(localStorage.getItem("checkout_email") || "");
    try { const s = JSON.parse(localStorage.getItem("checkout_dados") || "null"); if (s) { setD(s); setSalvar(true); } } catch { /* vazio */ }
  }, []);

  const continuar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = emailSchema.safeParse(email);
    if (!r.success) { setErro("Informe um e-mail válido."); return; }
    setErro("");
    localStorage.setItem("checkout_email", r.data);
    setOk(true);
  };

  const irEntrega = () => {
    if (!d.nome.trim() || !d.sobrenome.trim() || !d.cpf.trim() || !d.telefone.trim()) { setErro("Preencha todos os dados."); return; }
    setErro("");
    if (salvar) localStorage.setItem("checkout_dados", JSON.stringify(d)); else localStorage.removeItem("checkout_dados");
  };

  const itens = ["Identificar seu perfil", "Notificar sobre o andamento do seu pedido", "Gerenciar seu histórico de compras", "Acelerar o preenchimento de suas informações"];
  const card = "mt-4 bg-background p-5 shadow-sm";
  const titulo = "border-b pb-3 text-xl text-foreground";

  return (
    <div className="min-h-screen bg-muted" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <div className="mx-auto min-h-screen max-w-md bg-muted">
        <StoreHeader />
        <div className="bg-background shadow-sm"><Etapas etapa={3} /></div>
        <div className="p-2">
          <h1 className="mt-4 border-b-2 border-muted-foreground/40 pb-2 text-xl text-foreground">Finalizar compra</h1>

          {!ok ? (
            <div className="mt-5 bg-background px-3 pb-20 pt-6 shadow-sm">
              <div className="text-right"><Link to="/carrinho" className="text-sm text-foreground">Voltar para o carrinho</Link></div>
              <p className="mt-6 text-center text-lg text-foreground">Para finalizar a compra, informe seu e-mail.</p>
              <form onSubmit={continuar} className="mt-4 flex gap-2">
                <input type="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="min-w-0 flex-1 rounded border px-3 py-3 text-base" />
                <button className="rounded bg-primary px-4 text-xl text-primary-foreground">Continuar</button>
              </form>
              {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
              <p className="mt-12 text-center text-foreground">Usamos seu e-mail de forma 100% segura para:</p>
              <ul className="mt-2 space-y-1 text-center text-sm text-foreground">
                {itens.map((t) => <li key={t}><span className="text-[hsl(30_80%_60%)]">✓</span> {t}</li>)}
              </ul>
            </div>
          ) : (
            <>
              <div className={card}>
                <h2 className={titulo}>Dados pessoais</h2>
                <div className="mt-5 space-y-4 text-sm text-foreground">
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-right">E-mail</label>
                    <div className="relative flex-1">
                      <input value={email} readOnly onClick={() => setOk(false)} className={inp + " pr-7"} />
                      <span className="absolute right-2 top-1 text-[hsl(130_50%_42%)]">✓</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-right">Nome</label>
                    <input value={d.nome} maxLength={100} onChange={(e) => setD({ ...d, nome: e.target.value })} className={inp + " flex-1"} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-right">SOBRENOME</label>
                    <input value={d.sobrenome} maxLength={100} onChange={(e) => setD({ ...d, sobrenome: e.target.value })} className={inp + " max-w-[220px] flex-1"} />
                  </div>
                  <div>
                    <label className="ml-3 block">CPF</label>
                    <input value={d.cpf} maxLength={14} inputMode="numeric" onChange={(e) => setD({ ...d, cpf: e.target.value })} placeholder="999.999.999-99" className={inp + " mt-2 max-w-[130px]"} />
                  </div>
                  <div>
                    <label className="ml-3 block">TELEFONE</label>
                    <input value={d.telefone} maxLength={15} inputMode="tel" onChange={(e) => setD({ ...d, telefone: e.target.value })} placeholder="11 99999-9999" className={inp + " mt-2 max-w-[130px]"} />
                  </div>
                  <label className="flex items-center gap-3 pl-4">
                    <input type="checkbox" checked={salvar} onChange={(e) => setSalvar(e.target.checked)} className="h-5 w-5" />
                    Salvar minhas informações para próximas compras.
                  </label>
                  {erro && <p className="text-destructive">{erro}</p>}
                  <div className="flex justify-end">
                    <button onClick={irEntrega} className="rounded bg-primary px-7 py-3 text-base text-primary-foreground">Ir Para A Entrega</button>
                  </div>
                </div>
              </div>

              <div className={card}>
                <h2 className={titulo}>Entrega</h2>
                <p className="mt-4 text-center text-sm text-foreground">Aguardando o preenchimento dos dados</p>
              </div>
              <div className={card}>
                <h2 className={titulo}>Pagamento</h2>
                <p className="mt-4 text-center text-sm text-foreground">Aguardando o preenchimento dos dados</p>
              </div>

              <div className={card}>
                <h2 className={titulo}>Resumo do pedido</h2>
                <div className="mt-4 space-y-3">
                  {items.map((it, k) => (
                    <div key={k} className="flex items-center gap-3">
                      {it.image ? <img src={it.image} alt={it.name} className="h-20 w-14 object-cover" /> : <div className="h-20 w-14 bg-muted" />}
                      <p className="flex-1 text-xs font-bold text-foreground">{it.name} {it.size}</p>
                      <span className="text-[10px] font-bold">QTD: {it.qty}</span>
                      <span className="text-sm font-bold">{brl(it.price * it.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded border bg-muted p-3">
                  <p className="text-center text-sm font-bold text-foreground">CUPOM DE DESCONTO</p>
                  <div className="mt-2 flex gap-2">
                    <input value={cupom} maxLength={50} onChange={(e) => setCupom(e.target.value)} placeholder="Código" className="min-w-0 flex-1 rounded border bg-background px-2 py-1.5 text-sm" />
                    <button className="rounded bg-foreground px-3 text-sm text-background">Adicionar</button>
                  </div>
                </div>
                <div className="mt-5 space-y-1 px-6 text-sm">
                  <div className="flex justify-between"><span>SUBTOTAL</span><span className="font-bold">{brl(total)}</span></div>
                  <div className="flex justify-between text-base"><span className="font-bold">TOTAL</span><span>{brl(total)}</span></div>
                </div>
                <button className="mt-5 w-full rounded bg-primary py-3 text-lg text-primary-foreground">Finalizar Compra</button>
              </div>
            </>
          )}
        </div>
        <div className="mt-10"><StoreFooter /></div>
      </div>
    </div>
  );
}
