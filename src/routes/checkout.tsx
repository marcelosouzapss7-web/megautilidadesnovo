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

  const [fase, setFase] = useState<"dados" | "entrega">("dados");
  const [modo, setModo] = useState<"receber" | "retirar">("receber");
  const [cep, setCep] = useState("");
  const [cepErro, setCepErro] = useState("");
  const [end, setEnd] = useState<string | null>(null);
  const [frete, setFrete] = useState("Flex");
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
    { n: "Flex", p: "Em até 4 dias úteis", v: 12.21 },
    { n: "Sedex", p: "Em até 2 dias úteis", v: 17.9 },
    { n: "Pac", p: "Em até 5 dias úteis", v: 19.9 },
  ];

  const [pag, setPag] = useState(false);
  const [metodo, setMetodo] = useState("PIX");
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
                    <p className="mt-5 text-sm text-foreground">Retirada em loja — São Paulo (Capital)</p>
                  ) : (
                    <div className="mt-5 flex text-sm text-foreground">
                      <div className="flex-1 space-y-1 pr-3">
                        <p>{(end ?? "").split(" - ")[0]} {num}{comp ? `, ${comp}` : ""}</p>
                        <p>{(end ?? "").split(" - ").slice(1).join(" - ")}</p>
                        <p>{cep}</p>
                        <p className="pt-2">{freteSel?.n} · {freteSel?.p}</p>
                      </div>
                      <div className="flex items-center border-l pl-3">{freteSel && brl(freteSel.v)}</div>
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
                        <p className="mt-5 text-center">Retirada em loja — apenas em São Paulo (Capital). Consulte condições.</p>
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
                                  <span className="border-l pl-3 text-muted-foreground">{brl(f.v)}</span>
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
                    <div className="mt-6 border p-6 text-center">
                      <p className="text-3xl text-muted-foreground"><span className="text-[hsl(170_50%_50%)]">◆</span> {metodo.toLowerCase()}</p>
                      <p className="mt-4 text-sm text-foreground">Para pagar, finalize sua compra abaixo</p>
                      <p className="mt-1 text-muted-foreground">↓</p>
                    </div>
                  </div>
                )}
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
