"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { useCart } from "@/components/cart-provider";
import { Product } from "@/lib/types";

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 4h2l2.2 10.4a1 1 0 0 0 .98.8h9.9a1 1 0 0 0 .98-.8L21 7H7" />
      <circle cx="10" cy="19" r="1.2" />
      <circle cx="17" cy="19" r="1.2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { cart, detailedItems, total, incrementItem, decrementItem } = useCart();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const desktopSearchWrapRef = useRef<HTMLDivElement>(null);
  const mobileSearchWrapRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchCatalogRef = useRef<Product[] | null>(null);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const cartActive = pathname === "/cart" || pathname.startsWith("/cart/");
  const ordersActive = pathname === "/orders" || pathname.startsWith("/orders/");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchValue.trim().toLowerCase());
    }, 240);

    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    function onGlobalClick(event: MouseEvent) {
      const target = event.target as Node;

      const clickInsideDesktopSearch = desktopSearchWrapRef.current?.contains(target) ?? false;
      const clickInsideMobileSearch = mobileSearchWrapRef.current?.contains(target) ?? false;
      if (!clickInsideDesktopSearch && !clickInsideMobileSearch) {
        setSearchOpen(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setUserMenuOpen(false);
        setCartDrawerOpen(false);
      }
    }

    document.addEventListener("mousedown", onGlobalClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onGlobalClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!debouncedQuery) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);

      if (!searchCatalogRef.current) {
        try {
          const response = await fetch("/api/products", { cache: "no-store" });
          if (response.ok) {
            searchCatalogRef.current = (await response.json()) as Product[];
          } else {
            searchCatalogRef.current = [];
          }
        } catch {
          searchCatalogRef.current = [];
        }
      }

      if (cancelled) return;

      const results = (searchCatalogRef.current ?? [])
        .filter((product) => {
          const q = debouncedQuery;
          return (
            product.name.toLowerCase().includes(q) ||
            product.category.toLowerCase().includes(q) ||
            product.tags.some((tag) => tag.toLowerCase().includes(q))
          );
        })
        .slice(0, 6);

      setSearchResults(results);
      setSearchOpen(true);
      setSearchLoading(false);
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  async function onLogout() {
    await logout();
    setUserMenuOpen(false);
    setMobileOpen(false);
  }

  function clearSearch() {
    setSearchOpen(false);
  }

  function openCartDrawer() {
    setCartDrawerOpen(true);
    setMobileOpen(false);
  }

  function closeCartDrawer() {
    setCartDrawerOpen(false);
  }

  return (
    <header className="relative z-40 px-3 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-[#D4AF37]/30 bg-[linear-gradient(120deg,#101010,#1a1a1a_45%,#101010)] shadow-[0_14px_32px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-3 px-4 py-3 md:px-5">
          <Link href="/" className="group flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="rounded-xl border border-[#D4AF37]/35 bg-black/60 p-1.5 shadow-[0_0_18px_rgba(212,175,55,0.18)] transition group-hover:border-[#D4AF37]/65">
              <Image
                src="/logo.png"
                alt="Oar & Ore Logo"
                width={42}
                height={42}
                className="h-10 w-10 object-contain brightness-110 contrast-110"
                priority
                unoptimized
              />
            </span>
            <div>
              <p className="text-[13px] tracking-[0.26em] text-[#D4AF37]">OAR & ORE</p>
              <p className="text-[11px] text-zinc-400">Atölye üretim koleksiyon</p>
            </div>
          </Link>

          <div ref={desktopSearchWrapRef} className="relative hidden flex-1 px-2 md:block">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
                <SearchIcon />
              </span>
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onFocus={() => {
                  if (searchValue.trim().length > 0 || searchResults.length > 0) {
                    setSearchOpen(true);
                  }
                }}
                placeholder="Ürün ara"
                className="h-11 w-full rounded-xl border border-[#D4AF37]/25 bg-black/35 pl-10 pr-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#D4AF37]/55"
                aria-label="Ürün ara"
              />
            </div>

            {searchOpen && (searchValue.trim().length > 0 || searchLoading) && (
              <div className="absolute left-2 right-2 top-full mt-2 overflow-hidden rounded-xl border border-[#D4AF37]/30 bg-[linear-gradient(160deg,rgba(22,22,22,0.98),rgba(10,10,10,0.98))] shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
                {searchLoading ? (
                  <p className="px-4 py-3 text-sm text-zinc-400">Aranıyor...</p>
                ) : searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-zinc-500">Sonuç bulunamadı.</p>
                ) : (
                  <ul>
                    {searchResults.map((product) => (
                      <li key={product.id}>
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={clearSearch}
                          className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-[#D4AF37]/12 px-3 py-2.5 transition hover:bg-[#D4AF37]/8 last:border-b-0"
                        >
                          <span className="relative h-11 w-11 overflow-hidden rounded-md border border-[#D4AF37]/20 bg-black/35">
                            <Image
                              src={product.image || product.images?.[0] || "/logo.png"}
                              alt={product.name}
                              fill
                              sizes="44px"
                              className="object-cover"
                              loading="lazy"
                              fetchPriority="low"
                            />
                          </span>
                          <span className="truncate text-sm text-zinc-100">{product.name}</span>
                          <span className="text-sm font-semibold text-[#F3D47B]">
                            {product.price.toLocaleString("tr-TR")} TL
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="ml-auto rounded-xl border border-[#D4AF37]/35 bg-black/30 px-3 py-2 text-[11px] font-semibold tracking-[0.14em] text-[#D4AF37] transition hover:border-[#D4AF37]/60 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Menüyü aç"
          >
            {mobileOpen ? "KAPAT" : "MENÜ"}
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={openCartDrawer}
              className={`relative rounded-xl border px-3 py-2.5 text-zinc-100 transition ${
                cartActive || cartDrawerOpen
                  ? "border-[#D4AF37]/60 bg-[#D4AF37]/14 text-[#F3D47B]"
                  : "border-[#D4AF37]/30 bg-black/30 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
              }`}
              aria-label="Sepet"
            >
              <CartIcon />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-[#D4AF37]/55 bg-black px-1.5 text-[10px] font-semibold text-[#F3D47B]">
                  {cartCount}
                </span>
              )}
            </button>

            {authLoading ? (
              <span className="rounded-xl border border-[#D4AF37]/20 px-3 py-2 text-sm text-zinc-500">
                ...
              </span>
            ) : isAuthenticated ? (
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-[#D4AF37]/35 bg-black/30 px-3 py-2 text-sm text-zinc-100 transition hover:border-[#D4AF37]/60"
                >
                  <span className="rounded-full border border-[#D4AF37]/35 bg-black/40 p-1 text-[#D4AF37]">
                    <UserIcon />
                  </span>
                  <span className="max-w-40 truncate">{user?.name}</span>
                  <ChevronIcon open={userMenuOpen} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[#D4AF37]/30 bg-[linear-gradient(160deg,rgba(22,22,22,0.98),rgba(10,10,10,0.98))] p-2 shadow-[0_14px_30px_rgba(0,0,0,0.4)]">
                    <Link
                      href="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className={`block rounded-lg border px-3 py-2 text-sm transition ${
                        ordersActive
                          ? "border-[#D4AF37]/50 bg-[#D4AF37]/12 text-[#F3D47B]"
                          : "border-transparent text-zinc-200 hover:border-[#D4AF37]/35 hover:text-[#D4AF37]"
                      }`}
                    >
                      Siparişlerim
                    </Link>
                    <Link
                      href="/contact"
                      onClick={() => setUserMenuOpen(false)}
                      className="mt-1 block rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-200 transition hover:border-[#D4AF37]/35 hover:text-[#D4AF37]"
                    >
                      İletişim
                    </Link>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-200 transition hover:border-[#D4AF37]/35 hover:text-[#D4AF37]"
                    >
                      <LogoutIcon />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-[#D4AF37]/35 px-3 py-2 text-sm text-zinc-100 transition hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
                >
                  Giriş
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-3 py-2 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37]"
                >
                  Üye Ol
                </Link>
              </div>
            )}
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-[#D4AF37]/20 bg-black/30 p-3 md:hidden">
            <div ref={mobileSearchWrapRef} className="relative mb-3">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
                  <SearchIcon />
                </span>
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onFocus={() => {
                    if (searchValue.trim().length > 0 || searchResults.length > 0) {
                      setSearchOpen(true);
                    }
                  }}
                  placeholder="Ürün ara"
                  className="h-10 w-full rounded-xl border border-[#D4AF37]/25 bg-black/35 pl-10 pr-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#D4AF37]/55"
                  aria-label="Ürün ara"
                />
              </div>

              {searchOpen && (searchValue.trim().length > 0 || searchLoading) && (
                <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-[#D4AF37]/30 bg-[linear-gradient(160deg,rgba(22,22,22,0.98),rgba(10,10,10,0.98))] shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
                  {searchLoading ? (
                    <p className="px-4 py-3 text-sm text-zinc-400">Aranıyor...</p>
                  ) : searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-zinc-500">Sonuç bulunamadı.</p>
                  ) : (
                    <ul>
                      {searchResults.map((product) => (
                        <li key={product.id}>
                          <Link
                            href={`/products/${product.slug}`}
                            onClick={() => {
                              clearSearch();
                              setMobileOpen(false);
                            }}
                            className="grid grid-cols-[40px_1fr_auto] items-center gap-2 border-b border-[#D4AF37]/12 px-3 py-2.5 transition hover:bg-[#D4AF37]/8 last:border-b-0"
                          >
                            <span className="relative h-10 w-10 overflow-hidden rounded-md border border-[#D4AF37]/20 bg-black/35">
                              <Image
                                src={product.image || product.images?.[0] || "/logo.png"}
                                alt={product.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                                loading="lazy"
                                fetchPriority="low"
                              />
                            </span>
                            <span className="truncate text-sm text-zinc-100">{product.name}</span>
                            <span className="text-xs font-semibold text-[#F3D47B]">
                              {product.price.toLocaleString("tr-TR")} TL
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <button
                type="button"
                onClick={openCartDrawer}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  cartActive || cartDrawerOpen
                    ? "border-[#D4AF37]/55 bg-[#D4AF37]/12 text-[#F3D47B]"
                    : "border-[#D4AF37]/20 text-zinc-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <CartIcon />
                  Sepet
                </span>
                {cartCount > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-[#D4AF37]/55 bg-black px-1.5 text-[10px] font-semibold text-[#F3D47B]">
                    {cartCount}
                  </span>
                )}
              </button>

              {authLoading ? (
                <span className="rounded-xl border border-[#D4AF37]/20 px-3 py-2 text-sm text-zinc-500">
                  ...
                </span>
              ) : isAuthenticated ? (
                <>
                  <div className="rounded-xl border border-[#D4AF37]/20 bg-black/30 px-3 py-2.5">
                    <p className="text-sm text-zinc-100">{user?.name}</p>
                    <Link
                      href="/orders"
                      onClick={() => setMobileOpen(false)}
                      className={`mt-2 block rounded-lg border px-2.5 py-2 text-sm transition ${
                        ordersActive
                          ? "border-[#D4AF37]/50 bg-[#D4AF37]/12 text-[#F3D47B]"
                          : "border-[#D4AF37]/20 text-zinc-200"
                      }`}
                    >
                      Siparişlerim
                    </Link>
                    <Link
                      href="/contact"
                      onClick={() => setMobileOpen(false)}
                      className="mt-2 block rounded-lg border border-[#D4AF37]/20 px-2.5 py-2 text-sm text-zinc-200"
                    >
                      İletişim
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-2 rounded-xl border border-[#D4AF37]/35 px-3 py-2 text-left text-sm text-[#D4AF37]"
                  >
                    <LogoutIcon />
                    <span>Çıkış Yap</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl border border-[#D4AF37]/20 px-3 py-2 text-sm text-zinc-200"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-3 py-2 text-sm font-semibold text-black"
                  >
                    Üye Ol
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>

      <AnimatePresence>
        {cartDrawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Sepet panelini kapat"
              onClick={closeCartDrawer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="fixed right-0 top-0 z-[60] h-screen w-full max-w-md border-l border-[#D4AF37]/30 bg-[linear-gradient(160deg,rgba(20,20,20,0.97),rgba(8,8,8,0.98))] p-4 shadow-[-18px_0_40px_rgba(0,0,0,0.45)]"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-[#D4AF37]/18 pb-3">
                  <div>
                    <p className="text-xs tracking-[0.22em] text-[#D4AF37]">SEPET</p>
                    <p className="mt-1 text-sm text-zinc-400">{cartCount} ürün</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCartDrawer}
                    className="rounded-lg border border-[#D4AF37]/35 px-3 py-1.5 text-xs text-[#F3D47B]"
                  >
                    Kapat
                  </button>
                </div>

                <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
                  {detailedItems.length === 0 ? (
                    <div className="rounded-xl border border-[#D4AF37]/20 bg-black/30 p-4 text-sm text-zinc-400">
                      Sepetiniz boş.
                    </div>
                  ) : (
                    detailedItems.map((item) => (
                      <div
                        key={item.itemKey}
                        className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-xl border border-[#D4AF37]/16 bg-black/25 p-2.5"
                      >
                        <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-[#D4AF37]/18 bg-black/40">
                          <Image
                            src={item.product.image || item.product.images?.[0] || "/logo.png"}
                            alt={item.product.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                            loading="lazy"
                            fetchPriority="low"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-zinc-100">{item.product.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => decrementItem(item.itemKey)}
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D4AF37]/35 text-xs text-zinc-200 transition hover:bg-[#D4AF37]/12"
                              aria-label={`${item.product.name} miktarını azalt`}
                            >
                              -
                            </button>
                            <p className="text-xs text-zinc-400">x{item.quantity}</p>
                            <button
                              type="button"
                              onClick={() => incrementItem(item.itemKey)}
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D4AF37]/35 text-xs text-zinc-200 transition hover:bg-[#D4AF37]/12"
                              aria-label={`${item.product.name} miktarını artır`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-[#F3D47B]">
                          {(item.unitPrice * item.quantity).toLocaleString("tr-TR")} TL
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 border-t border-[#D4AF37]/18 pt-3">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Toplam</span>
                    <span className="font-semibold text-[#D4AF37]">{total.toLocaleString("tr-TR")} TL</span>
                  </div>
                  <div className="grid gap-2">
                    <Link
                      href="/cart"
                      onClick={closeCartDrawer}
                      className="rounded-lg border border-[#D4AF37]/35 px-3 py-2 text-center text-sm text-[#D4AF37]"
                    >
                      Sepete Git
                    </Link>
                    <Link
                      href="/checkout"
                      onClick={closeCartDrawer}
                      className="rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-3 py-2 text-center text-sm font-semibold text-black"
                    >
                      Ödemeye Geç
                    </Link>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
