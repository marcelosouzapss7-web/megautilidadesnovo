import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart } from "@/lib/cart";
import { CartDrawer } from "@/components/CartDrawer";
import logoMegaShopping from "@/assets/logo-mega-shopping.png.asset.json";

export function StoreHeader() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [menu, setMenu] = useState(false);
  const [busca, setBusca] = useState(false);
  const [termo, setTermo] = useState("");
  const { data: produtos = [] } = useQuery({
    queryKey: ["busca_produtos"],
    enabled: busca,
    queryFn: async () => (await supabase.from("products").select("id,name,price,image_url")).data ?? [],
  });
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const t = norm(termo.trim());
  const achados = t ? produtos.filter((p) => norm(p.name).includes(t)) : [];
  const qtd = useCart().items.reduce((s, i) => s + i.qty, 0);
  return (
    <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between bg-header px-4 shadow-sm">
      <div className="flex items-center gap-5 text-header-foreground">
        <button aria-label="Abrir menu" onClick={() => setMenu(true)} className="grid size-7 place-items-center">
        <svg width="26" height="22" viewBox="0 0 26 22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M2 2h22M2 11h15M2 20h19" />
        </svg>
        </button>
        <button aria-label="Pesquisar" onClick={() => { setBusca((b) => !b); setTermo(""); }} className="grid size-8 place-items-center">
          <Search className="size-7" strokeWidth={2.4} />
        </button>
      </div>
      <Link to="/">
        {isLoading ? (
          <div className="h-9 w-40" />
        ) : settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo da loja" className="h-[60px] max-w-[150px] object-contain" />
        ) : <img src={logoMegaShopping.url} alt="MEGA SHOPPING" className="h-[60px] w-auto object-contain" />}
      </Link>
      <div className="flex items-center gap-5 text-header-foreground">
        <User className="size-7" strokeWidth={2.4} />
        <button aria-label="Abrir sacola" onClick={cart.open} className="relative grid size-8 place-items-center">
          <ShoppingBag className="size-7" strokeWidth={2.4} />
          <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-header-foreground text-[9px] font-bold text-background">{qtd}</span>
        </button>
        <CartDrawer />
      </div>
      {busca && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-40 bg-foreground/60" onClick={() => { setBusca(false); setTermo(""); }}>
          <div className="border-b bg-background px-3 py-3" onClick={(e) => e.stopPropagation()}>
            <input autoFocus value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="O QUE VOCÊ ESTÁ PROCURANDO?" className="w-full bg-transparent text-sm outline-none placeholder:text-foreground" />
          </div>
          {t.length > 0 && (
            <div className="max-h-full overflow-y-auto px-6 pb-40 pt-6">
              {achados.length === 0 ? (
                <p className="text-center text-sm text-background">Nenhum produto encontrado.</p>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {achados.map((p) => (
                    <Link key={p.id} to="/produto/$id" params={{ id: p.id }} onClick={() => { setBusca(false); setTermo(""); }} className="flex flex-col items-center text-center">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="aspect-[2/3] w-full max-w-[120px] rounded object-cover" />}
                      <span className="mt-3 text-xs font-semibold uppercase text-background">{p.name}</span>
                      <span className="mt-2 text-sm font-bold text-background">R$ {Number(p.price).toFixed(2).replace(".", ",")}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {menu && (
        <div className="fixed inset-0 z-50 bg-foreground/40" onClick={() => setMenu(false)}>
          <nav className="h-full w-[77%] max-w-sm bg-background px-6 pt-5" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "Montserrat, sans-serif" }}>
            {[{ t: "Início", to: "/" }, { t: "Produtos", to: "/" }].map((l) => (
              <Link key={l.t} to={l.to as "/"} onClick={() => setMenu(false)} className="block border-b py-4 text-[15px] font-semibold text-foreground">{l.t}</Link>
            ))}
            <Link to="/carrinho" onClick={() => setMenu(false)} className="block border-b py-4 text-[15px] font-semibold text-foreground">Meu carrinho</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
