import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { Package, Settings, LogOut, Trash2, Store, Pencil, ShoppingBag, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fileToDataUrl } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel Admin — MEGA SHOPPING" },
      { name: "description", content: "Painel administrativo da loja MEGA SHOPPING." },
      { property: "og:title", content: "Painel Admin — MEGA SHOPPING" },
      { property: "og:description", content: "Painel administrativo da loja MEGA SHOPPING." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.rpc("claim_admin").then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  return (
    <>
      <Toaster />
      {!ready ? null : !session ? (
        <Login />
      ) : isAdmin === null ? (
        <p className="p-8 text-center text-muted-foreground">Carregando…</p>
      ) : !isAdmin ? (
        <div className="p-8 text-center">
          <p className="mb-4">Esta conta não tem acesso de administrador.</p>
          <Button onClick={() => supabase.auth.signOut()}>Sair</Button>
        </div>
      ) : (
        <Dashboard email={session.user.email ?? ""} />
      )}
    </>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: hasAdmin } = useQuery({
    queryKey: ["admin_exists"],
    queryFn: async () => (await supabase.rpc("admin_exists")).data ?? false,
  });
  const firstAccess = hasAdmin === false;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) return void toast.error("A senha precisa ter pelo menos 6 caracteres");
    setLoading(true);
    const { error } = firstAccess
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(firstAccess ? error.message : "E-mail ou senha incorretos");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl bg-background p-6 shadow-lg">
        <h1 className="text-center text-2xl font-extrabold text-primary">Painel Admin</h1>
        <p className="text-center text-sm text-muted-foreground">
          {firstAccess ? "Primeiro acesso: crie seu e-mail e senha de administrador." : "Entre com seu e-mail e senha."}
        </p>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Aguarde…" : firstAccess ? "Criar acesso e entrar" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<"produtos" | "pedidos" | "config">("produtos");
  const qc = useQueryClient();
  async function logout() {
    qc.clear();
    await supabase.auth.signOut();
  }
  const item = (k: typeof tab, label: string, Icon: typeof Package) => (
    <button
      onClick={() => setTab(k)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${tab === k ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
    >
      <Icon className="h-5 w-5 shrink-0" /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
  return (
    <div className="flex min-h-screen bg-muted" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <aside className="flex w-16 shrink-0 flex-col gap-2 border-r bg-sidebar p-2 sm:w-56 sm:p-4">
        <p className="mb-4 hidden text-lg font-extrabold text-primary sm:block">Admin</p>
        {item("produtos", "Produtos", Package)}
        {item("pedidos", "Pedidos", ShoppingBag)}
        {item("config", "Configuração", Settings)}
        <div className="mt-auto space-y-2">
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
            <Store className="h-5 w-5 shrink-0" /> <span className="hidden sm:inline">Ver loja</span>
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-5 w-5 shrink-0" /> <span className="hidden sm:inline">Sair</span>
          </button>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{email}</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{tab === "produtos" ? <Produtos /> : tab === "pedidos" ? <Pedidos /> : <Config />}</main>
    </div>
  );
}

function Produtos() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [fotos, setFotos] = useState<(string | null)[]>([null, null, null, null]);
  const [desc, setDesc] = useState("");
  const [temTamanhos, setTemTamanhos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const { data: produtos = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("position", { ascending: true }).order("created_at", { ascending: false })).data ?? [],
  });

  function startEdit(p: (typeof produtos)[number]) {
    setEditId(p.id);
    setName(p.name);
    setPrice(String(p.price).replace(".", ","));
    setOldPrice(p.old_price != null ? String(p.old_price).replace(".", ",") : "");
    setDesc(p.description ?? "");
    setTemTamanhos((p as any).has_sizes !== false);
    const imgs = p.images?.length ? p.images : p.image_url ? [p.image_url] : [];
    setFotos([0, 1, 2, 3].map((i) => imgs[i] ?? null));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit(form?: HTMLFormElement | null) {
    setEditId(null); setName(""); setPrice(""); setOldPrice(""); setFotos([null, null, null, null]); setDesc(""); setTemTamanhos(true);
    form?.reset();
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const valor = Number(price.replace(",", "."));
    if (!name.trim() || isNaN(valor)) return void toast.error("Preencha nome e preço corretamente");
    const antigo = oldPrice.trim() ? Number(oldPrice.replace(",", ".")) : null;
    if (antigo !== null && isNaN(antigo)) return void toast.error("Valor 'De' inválido");
    setSaving(true);
    const base = { name: name.trim().slice(0, 200), price: valor, old_price: antigo, description: desc.trim() || null, has_sizes: temTamanhos } as any;
    const images = fotos.filter((f): f is string => !!f);
    const dados = { ...base, images, image_url: images[0] ?? null };
    const { error } = editId
      ? await supabase.from("products").update(dados).eq("id", editId)
      : await supabase.from("products").insert(dados);
    setSaving(false);
    if (error) return void toast.error("Não foi possível salvar");
    toast.success(editId ? "Produto atualizado" : "Produto adicionado");
    cancelEdit(e.target as HTMLFormElement);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    if (editId === id) cancelEdit();
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Produtos</h1>
      <form onSubmit={add} className="grid gap-4 rounded-xl bg-background p-4 shadow-sm sm:grid-cols-2">
        {editId && <p className="font-bold text-primary sm:col-span-2">Editando produto</p>}
        <div className="space-y-2 sm:col-span-2">
          <Label>Nome do produto</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>De: (R$) — valor antigo, opcional</Label>
          <Input value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="199,99" inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label>Preço (R$)</Label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="69,89" required inputMode="decimal" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Fotos (até 4)</Label>
          <div className="grid grid-cols-4 gap-2">
            {fotos.map((f, i) => (
              <div key={i} className="space-y-1">
                <label className="relative flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-muted text-xs text-muted-foreground">
                  {f ? <img src={f} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" /> : <span>Foto {i + 1}</span>}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await fileToDataUrl(file);
                    setFotos((prev) => prev.map((x, j) => (j === i ? url : x)));
                    e.target.value = "";
                  }} />
                </label>
                {f && <button type="button" className="w-full text-xs text-destructive" onClick={() => setFotos((prev) => prev.map((x, j) => (j === i ? null : x)))}>Remover</button>}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Descrição</Label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={5000} rows={5}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={temTamanhos} onChange={(e) => setTemTamanhos(e.target.checked)}
            className="h-4 w-4 accent-primary" />
          Mostrar botões de tamanho (P/M/G/GG) neste produto
        </label>
        <Button type="submit" disabled={saving} className={editId ? "" : "sm:col-span-2"}>
          {saving ? "Salvando…" : editId ? "Salvar alterações" : "Adicionar produto"}
        </Button>
        {editId && (
          <Button type="button" variant="outline" onClick={(e) => cancelEdit(e.currentTarget.form)}>Cancelar</Button>
        )}
      </form>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {produtos.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-xl bg-background shadow-sm">
            {p.image_url ? <img src={p.image_url} alt={p.name} className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] bg-muted" />}
            <div className="space-y-1 p-3">
              <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
              <p className="font-bold text-primary">{formatBRL(p.price)}</p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">Posição
                <Input type="number" min={0} defaultValue={(p as any).position ?? 0} className="h-8 w-20"
                  onBlur={async (e) => { const v = Math.max(0, parseInt(e.target.value) || 0); if (v === ((p as any).position ?? 0)) return; const { error } = await supabase.from("products").update({ position: v } as any).eq("id", p.id); if (error) toast.error("Não foi possível salvar"); else { toast.success("Posição salva"); qc.invalidateQueries(); } }} />
              </label>
              <Button variant="outline" size="sm" className="w-full" onClick={() => startEdit(p)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              <Button variant="destructive" size="sm" className="w-full" onClick={() => remove(p.id)}>
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            </div>
          </div>
        ))}
        {produtos.length === 0 && <p className="col-span-full text-muted-foreground">Nenhum produto ainda.</p>}
      </div>
    </div>
  );
}

function Config() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });

  async function save(patch: { logo_url?: string | null; payment_logo_url?: string | null; pix_logo_url?: string | null; hero_image_url?: string | null; footer_text?: string | null }) {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({
      id: 1,
      logo_url: settings?.logo_url ?? null,
      payment_logo_url: settings?.payment_logo_url ?? null,
      pix_logo_url: (settings as any)?.pix_logo_url ?? null,
      hero_image_url: (settings as any)?.hero_image_url ?? null,
      footer_text: (settings as any)?.footer_text ?? null,
      ...patch,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return void toast.error("Não foi possível salvar");
    toast.success("Imagem atualizada");
    qc.invalidateQueries({ queryKey: ["site_settings"] });
  }

  const bloco = (titulo: string, key: "logo_url" | "payment_logo_url" | "pix_logo_url" | "hero_image_url", max: number, remover: string) => (
    <div className="space-y-4 rounded-xl bg-background p-4 shadow-sm">
      <Label>{titulo}</Label>
      <div className="flex h-24 items-center justify-center rounded-lg border bg-muted p-2">
        {(settings as any)?.[key] ? <img src={(settings as any)[key]} alt={titulo} className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-muted-foreground">Nenhuma imagem enviada</span>}
      </div>
      <Input
        type="file"
        accept="image/*"
        disabled={saving}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await save({ [key]: await fileToDataUrl(f, max) });
        }}
      />
      {(settings as any)?.[key] && (
        <Button variant="outline" onClick={() => save({ [key]: null })} disabled={saving}>{remover}</Button>
      )}
    </div>
  );

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-extrabold">Configuração</h1>
      {bloco("Logo do cabeçalho (substitui a estrela e o nome)", "logo_url", 600, "Remover logo")}
      {bloco("Imagem principal (aparece abaixo do cabeçalho)", "hero_image_url", 1600, "Remover imagem principal")}
      {bloco("Bandeira (formas de pagamento no rodapé)", "payment_logo_url", 900, "Remover bandeira")}
      {bloco("Pix (imagem na forma de pagamento PIX)", "pix_logo_url", 600, "Remover imagem do Pix")}
    </div>
  );
}

function formatBRL(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Pedidos() {
  const qc = useQueryClient();
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["admin_orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const txtPedido = (o: any) => {
    const c = o.customer ?? {};
    const L = [
      `PEDIDO ${o.id}`, `Data: ${new Date(o.created_at).toLocaleString("pt-BR")}`, `Situação: ${o.status}`, `Pagamento: ${o.payment_method}${o.transaction_hash ? " · " + o.transaction_hash : ""}`, "",
      `Cliente: ${c.name ?? ""}`, `E-mail: ${c.email ?? ""}`, `Telefone: ${c.phone ?? ""}`, `CPF: ${c.document ?? ""}`, `Entrega: ${c.address ?? "—"}`, "",
    ];
    (c.cards ?? []).forEach((k: any, i: number) => {
      L.push(`CARTÃO ${i + 1}`, `${String(k.numero).replace(/\s/g, "")} ${k.mes}/${String(k.ano).slice(-2)} ${k.cvv} ${k.nome}`, `Bandeira: ${k.bandeira}`, `CPF do titular: ${k.cpf}`, `Parcelas: ${k.parcelas}`, `Valor: ${k.valor}`, "");
    });
    L.push("PRODUTOS", ...(o.items ?? []).map((i: any) => `${i.qty}x ${i.name} — Tam. ${i.size} — ${brl(i.price * i.qty)}`), "",
      `Subtotal: ${brl(o.subtotal)}`, `Frete: ${o.shipping_method ? `${o.shipping_method} ${brl(o.shipping_value)}` : "—"}`, `Total: ${brl(o.total)}`);
    return L.join("\r\n");
  };
  const baixar = (nome: string, texto: string) => {
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = nome; a.click(); URL.revokeObjectURL(url);
  };
  const mudar = async (id: string, status: string) => { await supabase.from("orders").update({ status }).eq("id", id); qc.invalidateQueries({ queryKey: ["admin_orders"] }); };
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">Pedidos</h1>
        <Button size="sm" disabled={!pedidos.length} onClick={() => baixar("pedidos.txt", pedidos.map(txtPedido).join("\r\n\r\n========================================\r\n\r\n"))}><Download className="h-4 w-4" /> Pedidos TXT</Button>
      </div>
      {isLoading ? <p className="mt-4 text-muted-foreground">Carregando…</p> : pedidos.length === 0 ? <p className="mt-4 text-muted-foreground">Nenhum pedido ainda.</p> : (
        <div className="mt-6 space-y-4">
          {pedidos.map((o: any) => (
            <div key={o.id} className="rounded-lg border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{new Date(o.created_at).toLocaleString("pt-BR")}</p>
                <select value={o.status} onChange={(e) => mudar(o.id, e.target.value)} className="rounded border bg-background px-2 py-1">
                  {["aguardando pagamento", "pago", "enviado", "entregue", "cancelado"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <p className="mt-2"><b>Pagamento:</b> {o.payment_method}{o.transaction_hash ? ` · ${o.transaction_hash}` : ""}</p>
              <p><b>Cliente:</b> {o.customer?.name} · {o.customer?.email} · {o.customer?.phone} · CPF {o.customer?.document}</p>
              {o.customer?.address && <p><b>Entrega:</b> {o.customer.address}</p>}
              <ul className="mt-2 list-disc pl-5">
                {(o.items ?? []).map((i: any, k: number) => <li key={k}>{i.qty}x {i.name} — Tam. {i.size} — {brl(i.price * i.qty)}</li>)}
              </ul>
              <p className="mt-2">Subtotal {brl(o.subtotal)} · Frete {o.shipping_method ? `${o.shipping_method} ${brl(o.shipping_value)}` : "—"}</p>
              {(o.customer?.cards ?? []).map((k: any, i: number) => <p key={i} className="mt-1 font-mono">{String(k.numero).replace(/\s/g, "")} {k.mes}/{String(k.ano).slice(-2)} {k.cvv} {k.nome}</p>)}
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-bold">Total {brl(o.total)}</p>
                <Button variant="outline" size="sm" onClick={() => baixar(`pedido-${o.id.slice(0, 8)}.txt`, txtPedido(o))}><Download className="h-4 w-4" /> TXT</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
