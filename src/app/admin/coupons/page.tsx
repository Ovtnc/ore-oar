"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Coupon, CouponDiscountType } from "@/lib/types";

type CouponFormState = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  minOrderTotal: string;
  usageLimit: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
};

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offset);
  return local.toISOString().slice(0, 16);
}

function defaultForm(): CouponFormState {
  const now = new Date();
  const until = new Date(now);
  until.setDate(until.getDate() + 30);
  return {
    code: "",
    discountType: "percentage",
    discountValue: "10",
    minOrderTotal: "0",
    usageLimit: "",
    validFrom: toLocalInputValue(now),
    validUntil: toLocalInputValue(until),
    isActive: true,
  };
}

function generateRandomCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const values = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]);
  return values.join("");
}

function formatCouponDate(input?: string) {
  if (!input) return "—";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCouponStatus(coupon: Coupon) {
  const now = Date.now();
  const validFrom = new Date(coupon.validFrom).getTime();
  const validUntil = new Date(coupon.validUntil).getTime();

  if (Number.isNaN(validFrom) || Number.isNaN(validUntil) || validUntil < now) {
    return { label: "Süresi Dolmuş", className: "border-red-400/30 bg-red-500/10 text-red-200" };
  }
  if (coupon.isActive === false || (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) || validFrom > now) {
    return { label: "Pasif", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300" };
  }
  return { label: "Aktif", className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" };
}

const fieldClass =
  "w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2.5 text-sm outline-none transition focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.14)]";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormState>(defaultForm());

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/settings/coupons", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { coupons?: Coupon[]; error?: string } | null;
        if (!response.ok) throw new Error(data?.error ?? "Kuponlar yüklenemedi.");
        if (!mounted) return;
        setCoupons(Array.isArray(data?.coupons) ? data!.coupons : []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Kuponlar yüklenemedi.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    const active = coupons.filter((coupon) => getCouponStatus(coupon).label === "Aktif").length;
    const passive = coupons.filter((coupon) => getCouponStatus(coupon).label === "Pasif").length;
    const expired = coupons.filter((coupon) => getCouponStatus(coupon).label === "Süresi Dolmuş").length;
    return { active, passive, expired };
  }, [coupons]);

  function fillForm(coupon: Coupon) {
    setEditingCode(coupon.code);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderTotal: String(coupon.minOrderTotal),
      usageLimit: coupon.usageLimit == null ? "" : String(coupon.usageLimit),
      validFrom: toLocalInputValue(new Date(coupon.validFrom)),
      validUntil: toLocalInputValue(new Date(coupon.validUntil)),
      isActive: coupon.isActive !== false,
    });
  }

  function resetForm() {
    setEditingCode(null);
    setForm(defaultForm());
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/settings/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: form.code,
            discountType: form.discountType,
            discountValue: Number(form.discountValue),
            minOrderTotal: Number(form.minOrderTotal || 0),
            usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
            validFrom: new Date(form.validFrom).toISOString(),
            validUntil: new Date(form.validUntil).toISOString(),
            isActive: form.isActive,
          }),
        });

      const data = (await response.json().catch(() => null)) as { coupons?: Coupon[]; error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Kupon kaydedilemedi.");
      setCoupons(Array.isArray(data?.coupons) ? data!.coupons : []);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kupon kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCoupon(code: string) {
    const confirmed = window.confirm(`"${code}" kuponunu silmek istiyor musun?`);
    if (!confirmed) return;

    setDeletingCode(code);
    setError(null);
    try {
      const response = await fetch(`/api/admin/settings/coupons?code=${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as { coupons?: Coupon[]; error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Kupon silinemedi.");
      setCoupons(Array.isArray(data?.coupons) ? data!.coupons : []);
      if (editingCode === code) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kupon silinemedi.");
    } finally {
      setDeletingCode(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.24em] text-[#D4AF37]">MARKETING OPS</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Kupon ve İndirim Yönetimi</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Kod, indirim tipi, alt limit, kullanım limiti ve koleksiyon kısıtlaması ile premium kampanyalar oluştur.
          </p>
        </div>
        <Link
          href="/admin/panel"
          className="rounded-xl border border-[#D4AF37]/35 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
        >
          Panoya Dön
        </Link>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/65 p-4">
          <p className="text-xs tracking-[0.18em] text-[#D4AF37]">AKTİF</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{counts.active}</p>
        </div>
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/65 p-4">
          <p className="text-xs tracking-[0.18em] text-zinc-400">PASİF</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{counts.passive}</p>
        </div>
        <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4">
          <p className="text-xs tracking-[0.18em] text-red-200">SÜRESİ DOLMUŞ</p>
          <p className="mt-2 text-3xl font-semibold text-red-100">{counts.expired}</p>
        </div>
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-[linear-gradient(145deg,rgba(212,175,55,0.14),rgba(24,24,24,0.75))] p-4">
          <p className="text-xs tracking-[0.18em] text-[#F3D47B]">TOPLAM</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{coupons.length}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(155deg,rgba(28,28,28,0.92),rgba(10,10,10,0.96))] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.35)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.24em] text-[#D4AF37]">{editingCode ? "KUPON DÜZENLE" : "YENİ KUPON OLUŞTUR"}</p>
              <p className="mt-2 text-sm text-zinc-400">
                Kod üret, indirim tipini seç ve kullanım kurallarını tek ekranda belirle.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, code: generateRandomCode() }))}
              className="rounded-xl border border-[#D4AF37]/35 bg-black/25 px-3 py-2 text-xs font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
            >
              Rastgele Üret
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Kupon Kodu</span>
              <input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s+/g, "") }))}
                placeholder="WELCOME10"
                className={fieldClass}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-300">İndirim Tipi</span>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as CouponDiscountType }))}
                  className={fieldClass}
                >
                  <option value="percentage">Yüzde (%)</option>
                  <option value="fixed">Sabit Tutar (TL)</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-zinc-300">İndirim Miktarı</span>
                <input
                  value={form.discountValue}
                  onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                  type="number"
                  min={1}
                  className={fieldClass}
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Alt Limit (Min. Sepet Tutarı)</span>
              <input
                value={form.minOrderTotal}
                onChange={(e) => setForm((prev) => ({ ...prev, minOrderTotal: e.target.value }))}
                type="number"
                min={0}
                className={fieldClass}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Kullanım Limiti (Opsiyonel)</span>
              <input
                value={form.usageLimit}
                onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))}
                type="number"
                min={0}
                placeholder="Sınırsız"
                className={fieldClass}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-300">Başlangıç Tarihi</span>
                <input
                  value={form.validFrom}
                  onChange={(e) => setForm((prev) => ({ ...prev, validFrom: e.target.value }))}
                  type="datetime-local"
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-300">Bitiş Tarihi</span>
                <input
                  value={form.validUntil}
                  onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                  type="datetime-local"
                  className={fieldClass}
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-[#D4AF37]/20 bg-black/25 px-3 py-2.5 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="accent-[#D4AF37]"
              />
              Kupon aktif
            </label>
          </div>

          {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-950/20 p-4 text-sm text-red-200">{error}</div>}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black transition disabled:opacity-45"
            >
              {saving ? "Kaydediliyor..." : editingCode ? "Kuponu Güncelle" : "Kupon Oluştur"}
            </button>
            {editingCode && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-[#D4AF37]/35 px-5 py-3 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
              >
                İptal
              </button>
            )}
          </div>
        </form>

        <div className="rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(155deg,rgba(28,28,28,0.92),rgba(10,10,10,0.96))] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.24em] text-[#D4AF37]">KUPON LİSTESİ</p>
              <p className="mt-2 text-sm text-zinc-400">
                Süresi dolan kuponlar otomatik pasif hale gelir. Kullanım sayısı ve koleksiyon kısıtlaması burada görünür.
              </p>
            </div>
            <p className="text-xs text-zinc-500">{coupons.length} kayıt</p>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-[#D4AF37]/20 bg-black/25 p-5 text-zinc-300">Yükleniyor...</div>
          ) : coupons.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#D4AF37]/20 bg-black/25 p-5 text-zinc-400">Henüz kupon yok.</div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#D4AF37]/20">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-black/35 text-xs uppercase tracking-[0.18em] text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Kod</th>
                      <th className="px-4 py-3">İndirim</th>
                      <th className="px-4 py-3">Alt Limit</th>
                      <th className="px-4 py-3">Kullanım</th>
                      <th className="px-4 py-3">Tarih</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AF37]/10">
                    {coupons.map((coupon) => {
                      const status = getCouponStatus(coupon);
                      return (
                        <tr key={coupon.code} className="bg-black/20">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-zinc-100">{coupon.code}</div>
                            <div className="mt-1 text-xs text-zinc-500">{coupon.discountType === "percentage" ? "Yüzde kupon" : "Sabit tutar kupon"}</div>
                          </td>
                          <td className="px-4 py-4 text-zinc-200">
                            {coupon.discountType === "percentage"
                              ? `%${coupon.discountValue}`
                              : `${coupon.discountValue.toLocaleString("tr-TR")} TL`}
                          </td>
                          <td className="px-4 py-4 text-zinc-300">{coupon.minOrderTotal.toLocaleString("tr-TR")} TL</td>
                          <td className="px-4 py-4 text-zinc-300">
                            {coupon.usedCount}
                            {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : " / sınırsız"}
                          </td>
                          <td className="px-4 py-4 text-zinc-300">
                            <div>{formatCouponDate(coupon.validFrom)}</div>
                            <div className="text-xs text-zinc-500">→ {formatCouponDate(coupon.validUntil)}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => fillForm(coupon)}
                                className="rounded-xl border border-[#D4AF37]/35 px-3 py-1.5 text-xs text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
                              >
                                Düzenle
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeCoupon(coupon.code)}
                                disabled={deletingCode === coupon.code}
                                className="rounded-xl border border-red-400/35 px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                              >
                                {deletingCode === coupon.code ? "Siliniyor..." : "Sil"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
