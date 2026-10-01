import { Trash2, Check, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cart, useCart } from "@/lib/cart";

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const serif = { fontFamily: "Georgia, 'Times New Roman', serif" };

export function CartDrawer() {
  const { items, open, toast } = useCart();
  if (!open) return null;
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const qtd = items.reduce((s, i) => s + i.qty, 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-foreground/40" onClick={cart.close}>
      <div className="relative flex h-full w-full max-w-md flex-col bg-background" style={serif} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-7">
          <button onClick={cart.close} className="tracking-widest text-foreground">FECHAR</button>
          <span className="mx-4 h-px flex-1 bg-border" />
          <span className="tracking-widest text-primary">SACOLA</span>
        </div>
        <p className="mt-8 text-center text-xs tracking-widest text-muted-foreground">
          SUA SACOLA TEM: {qtd} {qtd === 1 ? "ITEM" : "ITENS"}
        </p>
        <div className="relative flex-1 overflow-y-auto px-4">
          {items.map((it, k) => (
            <div key={k} className="mt-5 flex gap-3">
              {it.image ? <img src={it.image} alt={it.name} className="h-24 w-[74px] rounded object-cover" /> : <div className="h-24 w-[74px] rounded bg-muted" />}
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-xs uppercase leading-5 text-foreground">{it.name}<br />{it.size}</p>
                  <button aria-label="Remover" onClick={() => cart.remove(k)} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex h-8 items-stretch rounded border text-sm">
                    <button className="w-9 bg-muted" onClick={() => cart.setQty(k, it.qty - 1)}>−</button>
                    <span className="grid w-9 place-items-center">{it.qty}</span>
                    <button className="w-9 bg-muted" onClick={() => cart.setQty(k, it.qty + 1)}>+</button>
                  </div>
                  <span className="text-primary">{brl(it.price * it.qty)}</span>
                </div>
              </div>
            </div>
          ))}
          {toast && (
            <div className="absolute left-14 right-14 top-24 flex items-center gap-3 rounded bg-background p-3 shadow-lg animate-fade-in" style={{ fontFamily: "Montserrat, sans-serif" }}>
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[hsl(110_50%_75%)] text-[hsl(110_50%_45%)]"><Check className="h-5 w-5" /></span>
              <span className="flex-1 text-sm text-muted-foreground">Produto adicionado ao carrinho</span>
              <button aria-label="Fechar aviso" onClick={cart.hideToast} className="text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
          )}
        </div>
        <div className="border-t px-6 pb-8 pt-6 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between">
            <span className="text-sm tracking-widest text-foreground">SUBTOTAL</span>
            <span className="text-lg text-foreground">{brl(total)}</span>
          </div>
          <Link to="/carrinho" onClick={cart.close} className="mt-8 block w-full rounded-full bg-foreground py-4 text-center text-lg tracking-[0.2em] text-background shadow-lg">FINALIZAR COMPRA</Link>
          <button onClick={cart.close} className="mx-auto mt-4 block text-xs tracking-wider text-muted-foreground underline">CONTINUAR COMPRANDO</button>
        </div>
      </div>
    </div>
  );
}
