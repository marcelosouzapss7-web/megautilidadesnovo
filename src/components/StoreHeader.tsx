import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Star, User, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart } from "@/lib/cart";
import { CartDrawer } from "@/components/CartDrawer";

export function StoreHeader() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [menu, setMenu] = useState(false);
  const qtd = useCart().items.reduce((s, i) => s + i.qty, 0);
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-background px-3 py-3 shadow-sm">
      <div className="flex items-center gap-3 text-primary">
        <button aria-label="Abrir menu" onClick={() => setMenu(true)}>
        <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M2 2h18M2 9h12M2 16h16" />
        </svg>
        </button>
        <Search className="h-6 w-6" />
      </div>
      <Link to="/">
        {isLoading ? (
          <div className="h-9 w-40" />
        ) : settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo da loja" className="h-10 max-w-[180px] object-contain" />
        ) : (
          <div className="flex flex-col items-end leading-none">
            <div className="flex items-center gap-1 text-primary">
              <Star className="h-5 w-5" strokeWidth={2.5} />
              <span className="text-lg font-extrabold tracking-tight">MERCADO SHOPPING</span>
            </div>
            <span className="text-[8px] italic text-muted-foreground">by Eder Barreira</span>
          </div>
        )}
      </Link>
      <div className="flex items-center gap-3 text-primary">
        <User className="h-6 w-6" />
        <button aria-label="Abrir sacola" onClick={cart.open} className="relative">
          <ShoppingBag className="h-6 w-6" />
          <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{qtd}</span>
        </button>
        <CartDrawer />
      </div>
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
