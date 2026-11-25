import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { products, Product } from "../features/catalog/data/products";

type CartLine = { product: Product; size: string; qty: number; variantId?: string };
type Store = {
  cart: CartLine[];
  wishlist: string[];
  add: (p: Product, size: string, variantId?: string) => void;
  remove: (id: string, size: string, variantId?: string) => void;
  qty: (id: string, size: string, n: number, variantId?: string) => void;
  clear: () => void;
  toggleWish: (id: string) => void;
  count: number;
  subtotal: number;
};
const C = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => {
    try { return JSON.parse(localStorage.getItem("MUSEHRA-cart") || "[]"); } catch { return []; }
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("MUSEHRA-wishlist") || "[]"); } catch { return []; }
  });
  const persist = (v: CartLine[]) => { setCart(v); localStorage.setItem("MUSEHRA-cart", JSON.stringify(v)); };
  const add = (p: Product, size: string, variantId?: string) => {
    const found = cart.find(x => x.product.id === p.id && x.size === size && x.variantId === variantId);
    persist(found ? cart.map(x => x === found ? { ...x, qty: x.qty + 1 } : x) : [...cart, { product: p, size, qty: 1, variantId }]);
  };
  const remove = (id: string, size: string, variantId?: string) => persist(cart.filter(x => !(x.product.id === id && x.size === size && (variantId === undefined || x.variantId === variantId))));
  const qty = (id: string, size: string, n: number, variantId?: string) => persist(cart.map(x => x.product.id === id && x.size === size && (variantId === undefined || x.variantId === variantId) ? { ...x, qty: Math.max(1, n) } : x));
  const clear = () => persist([]);
  const toggleWish = (id: string) => {
    const v = wishlist.includes(id) ? wishlist.filter(x => x !== id) : [...wishlist, id];
    setWishlist(v); localStorage.setItem("MUSEHRA-wishlist", JSON.stringify(v));
  };
  const value = useMemo(() => ({ cart, wishlist, add, remove, qty, clear, toggleWish, count: cart.reduce((s, x) => s + x.qty, 0), subtotal: cart.reduce((s, x) => s + x.product.price * x.qty, 0) }), [cart, wishlist]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useStore = () => { const v = useContext(C); if (!v) throw Error("StoreProvider missing"); return v; };
