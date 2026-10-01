import { useSyncExternalStore } from "react";

export type CartItem = { id: string; name: string; price: number; image: string | null; size: string; qty: number };
type State = { items: CartItem[]; open: boolean; toast: boolean };

let state: State = { items: [], open: false, toast: false };
let loaded = false;
const subs = new Set<() => void>();
const SERVER: State = { items: [], open: false, toast: false };

function set(s: Partial<State>) {
  state = { ...state, ...s };
  if (typeof window !== "undefined") localStorage.setItem("cart", JSON.stringify(state.items));
  subs.forEach((f) => f());
}
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { state = { ...state, items: JSON.parse(localStorage.getItem("cart") || "[]") }; } catch { /* vazio */ }
}

export function useCart() {
  return useSyncExternalStore(
    (f) => { load(); subs.add(f); f(); return () => subs.delete(f); },
    () => state,
    () => SERVER,
  );
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export const cart = {
  add(item: Omit<CartItem, "qty">) {
    load();
    const items = [...state.items];
    const ex = items.find((i) => i.id === item.id && i.size === item.size && i.image === item.image);
    if (ex) ex.qty += 1; else items.push({ ...item, qty: 1 });
    set({ items: items.map((i) => ({ ...i })), open: true, toast: true });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: false }), 3000);
  },
  setQty(i: number, qty: number) {
    const items = state.items.map((it, k) => (k === i ? { ...it, qty: Math.max(1, qty) } : it));
    set({ items });
  },
  remove(i: number) { set({ items: state.items.filter((_, k) => k !== i) }); },
  open() { set({ open: true }); },
  close() { set({ open: false, toast: false }); },
  hideToast() { set({ toast: false }); },
};
