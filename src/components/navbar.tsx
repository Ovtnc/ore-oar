"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCart } from "@/components/cart-provider";

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

export function Navbar() {
  const pathname = usePathname();
  const { cart } = useCart();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const cartActive = pathname === "/cart" || pathname.startsWith("/cart/");
  const ordersActive = pathname === "/orders" || pathname.startsWith("/orders/");

  async function onLogout() {
    await logout();
    setUserMenuOpen(false);
    setMobileOpen(false);
  }

  return (
    <header className="relative z-40 px-3 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-[#D4AF37]/30 bg-[linear-gradient(120deg,#101010,#1a1a1a_45%,#101010)] shadow-[0_14px_32px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between px-4 py-3 md:px-5">
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

          <button
            type="button"
            className="rounded-xl border border-[#D4AF37]/35 bg-black/30 px-3 py-2 text-[11px] font-semibold tracking-[0.14em] text-[#D4AF37] transition hover:border-[#D4AF37]/60 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Menüyü aç"
          >
            {mobileOpen ? "KAPAT" : "MENÜ"}
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/cart"
              className={`relative rounded-xl border px-3 py-2.5 text-zinc-100 transition ${
                cartActive
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
            </Link>

            {authLoading ? (
              <span className="rounded-xl border border-[#D4AF37]/20 px-3 py-2 text-sm text-zinc-500">
                ...
              </span>
            ) : isAuthenticated ? (
              <div className="relative">
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
            <div className="grid gap-2">
              <Link
                href="/cart"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  cartActive
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
              </Link>

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
    </header>
  );
}
