"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toSafePrice } from "@/lib/price";
import { CartItem, Product, ProductCoatingOption } from "@/lib/types";

type DetailedCartItem = {
  itemKey: string;
  product: Product;
  quantity: number;
  coatingOption: ProductCoatingOption | undefined;
  unitPrice: number;
};

type CartContextValue = {
  cart: CartItem[];
  total: number;
  detailedItems: DetailedCartItem[];
  catalogLoaded: boolean;
  addToCart: (productId: string, coatingOptionId?: string) => void;
  removeFromCart: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "oar-ore-cart";

function buildItemKey(productId: string, coatingOptionId?: string) {
  return `${productId}::${coatingOptionId ?? "none"}`;
}

function normalizeStoredCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.reduce<CartItem[]>((acc, entry) => {
    const item = entry as Partial<CartItem> | undefined;
    const productId = String(item?.productId ?? "").trim();
    if (!productId) return acc;

    const coatingOptionId = item?.coatingOptionId ? String(item.coatingOptionId) : undefined;
    const quantityRaw = Number(item?.quantity ?? 1);
    const quantity = Number.isFinite(quantityRaw) ? Math.max(1, Math.trunc(quantityRaw)) : 1;
    const itemKey = item?.itemKey ? String(item.itemKey) : buildItemKey(productId, coatingOptionId);

    acc.push(
      coatingOptionId
        ? { itemKey, productId, coatingOptionId, quantity }
        : { itemKey, productId, quantity },
    );
    return acc;
  }, []);
}

function findCoatingOption(product: Product, coatingOptionId?: string) {
  if (!coatingOptionId) return undefined;
  return product.coatingOptions?.find((option) => option.id === coatingOptionId);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [catalog, setCatalog] = useState<Record<string, Product>>({});
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    // Hydration mismatch'i engellemek için ilk render'da daima boş sepetle başlıyoruz.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(normalizeStoredCart(JSON.parse(raw) as unknown));
  }, []);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, Product> = {};
        (data as Product[]).forEach((product) => {
          map[product.id] = product;
        });
        setCatalog(map);
      })
      .catch(() => {
        setCatalog({});
      })
      .finally(() => setCatalogLoaded(true));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const detailedItems = useMemo(
    () =>
      cart
        .map((item) => {
          const product = catalog[item.productId];
          if (!product) return null;

          const coatingOption = findCoatingOption(product, item.coatingOptionId);
          const unitPrice = toSafePrice(product.price) + toSafePrice(coatingOption?.priceDelta);

          return {
            itemKey: item.itemKey,
            product,
            quantity: item.quantity,
            coatingOption,
            unitPrice,
          };
        })
        .filter((item): item is DetailedCartItem => item !== null),
    [cart, catalog],
  );

  const total = detailedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const value: CartContextValue = {
    cart,
    total,
    detailedItems,
    catalogLoaded,
    addToCart: (productId, coatingOptionId) =>
      setCart((prev) => {
        const itemKey = buildItemKey(productId, coatingOptionId);
        const existing = prev.find((item) => item.itemKey === itemKey);
        if (existing) {
          return prev.map((item) =>
            item.itemKey === itemKey ? { ...item, quantity: item.quantity + 1 } : item,
          );
        }
        return [...prev, { itemKey, productId, coatingOptionId, quantity: 1 }];
      }),
    removeFromCart: (itemKey) =>
      setCart((prev) => prev.filter((item) => item.itemKey !== itemKey)),
    updateQuantity: (itemKey, quantity) =>
      setCart((prev) =>
        prev
          .map((item) => (item.itemKey === itemKey ? { ...item, quantity: Math.max(quantity, 1) } : item))
          .filter((item) => item.quantity > 0),
      ),
    clearCart: () => setCart([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
