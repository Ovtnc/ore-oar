"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { OrderItem, OrderStatus, Product, ShippingInfo, SupportRequestStatus } from "@/lib/types";

type AdminOrder = {
  _id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  shipping: ShippingInfo;
  items: OrderItem[];
};

type SupportRequestPreview = {
  _id: string;
  orderId: string;
  userName: string;
  userEmail: string;
  productName: string;
  productVariant?: string;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  createdAt: string;
  lastReplyAt?: string;
  replyCount?: number;
};

const statuses: OrderStatus[] = [
  "Beklemede",
  "Ödeme Alındı",
  "Sipariş Hazırlanıyor",
  "Kargoya Verildi",
  "Tamamlandı",
];
const RECENT_ORDERS_PAGE_SIZE = 6;
const DEFAULT_IBAN = "TR00 0000 0000 0000 0000 0000 00";

type PaymentNotice = {
  type: "success" | "error";
  message: string;
};

type PaymentIbanFormRow = {
  id: string;
  label: string;
  accountHolderName: string;
  iban: string;
  usageCount: number;
  isActive: boolean;
};

type ShippingPricingForm = {
  shippingFee: number;
  freeShippingThreshold: number;
  updatedAt?: string;
};

function parseRecipientsInput(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[\n,;]+/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function createIbanRow(index: number): PaymentIbanFormRow {
  return {
    id: `iban-${index + 1}`,
    label: `Hesap ${index + 1}`,
    accountHolderName: "",
    iban: "",
    usageCount: 0,
    isActive: true,
  };
}

function InlineLoader({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-zinc-400">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#D4AF37]/50 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-xl border border-[#D4AF37]/15 bg-black/20 p-3">
      <div className="grid gap-2 md:grid-cols-2">
        <div className="h-9 animate-pulse rounded-lg bg-zinc-800/70" />
        <div className="h-9 animate-pulse rounded-lg bg-zinc-800/70" />
        <div className="h-9 animate-pulse rounded-lg bg-zinc-800/70 md:col-span-2" />
      </div>
      <div className="mt-2 h-6 w-28 animate-pulse rounded-full bg-zinc-800/70" />
    </div>
  );
}

function statusMeta(status: OrderStatus) {
  switch (status) {
    case "Beklemede":
      return { label: "Beklemede", className: "border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#ffd87a]" };
    case "Ödeme Alındı":
      return { label: "Ödeme Alındı", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" };
    case "Sipariş Hazırlanıyor":
      return { label: "Sipariş Hazırlanıyor", className: "border-blue-400/30 bg-blue-400/10 text-blue-200" };
    case "Kargoya Verildi":
      return { label: "Kargoya Verildi", className: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200" };
    case "Tamamlandı":
      return { label: "Tamamlandı", className: "border-zinc-500/40 bg-zinc-500/10 text-zinc-200" };
    default:
      return { label: status, className: "border-[#D4AF37]/30 bg-black/20 text-zinc-200" };
  }
}

export default function AdminPanelPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequestPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentOrdersPage, setRecentOrdersPage] = useState(1);
  const [paymentIbans, setPaymentIbans] = useState<PaymentIbanFormRow[]>([
    {
      ...createIbanRow(0),
      iban: DEFAULT_IBAN,
      id: "default-iban",
      label: "Varsayılan Hesap",
      accountHolderName: "Hesap Sahibi",
    },
  ]);
  const [paymentIbansLoading, setPaymentIbansLoading] = useState(true);
  const [paymentIbansSaving, setPaymentIbansSaving] = useState(false);
  const [paymentIbansNotice, setPaymentIbansNotice] = useState<PaymentNotice | null>(null);
  const [orderAlertRecipientsText, setOrderAlertRecipientsText] = useState("");
  const [orderAlertRecipients, setOrderAlertRecipients] = useState<string[]>([]);
  const [orderAlertLoading, setOrderAlertLoading] = useState(true);
  const [orderAlertSaving, setOrderAlertSaving] = useState(false);
  const [orderAlertNotice, setOrderAlertNotice] = useState<PaymentNotice | null>(null);
  const [isPaymentPanelOpen, setIsPaymentPanelOpen] = useState(true);
  const [isOrderAlertPanelOpen, setIsOrderAlertPanelOpen] = useState(false);
  const [shippingPricing, setShippingPricing] = useState<ShippingPricingForm>({
    shippingFee: 120,
    freeShippingThreshold: 2500,
  });
  const [shippingLoading, setShippingLoading] = useState(true);
  const [shippingSaving, setShippingSaving] = useState(false);
  const [shippingNotice, setShippingNotice] = useState<PaymentNotice | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const [ordersRes, productsRes, supportRes] = await Promise.all([
          fetch("/api/admin/orders", { cache: "no-store" }),
          fetch("/api/admin/products", { cache: "no-store" }),
          fetch("/api/admin/support-requests", { cache: "no-store" }),
        ]);

        if (!ordersRes.ok || !productsRes.ok) {
          throw new Error("Dashboard verileri alınamadı.");
        }

        const [ordersData, productsData] = await Promise.all([ordersRes.json(), productsRes.json()]);
        const supportData = supportRes.ok ? await supportRes.json().catch(() => []) : [];
        if (!mounted) return;

        setOrders(ordersData as AdminOrder[]);
        setProducts(productsData as Product[]);
        setSupportRequests(Array.isArray(supportData) ? (supportData as SupportRequestPreview[]) : []);
      } catch {
        if (!mounted) return;
        setError("Dashboard verileri yüklenemedi.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadShippingPricing() {
      setShippingLoading(true);
      setShippingNotice(null);
      try {
        const response = await fetch("/api/admin/settings/shipping", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as
          | { shippingFee?: number; freeShippingThreshold?: number; updatedAt?: string; error?: string }
          | null;
        if (!response.ok) {
          throw new Error(data?.error ?? "Kargo ayarı alınamadı.");
        }
        if (!mounted) return;
        setShippingPricing({
          shippingFee: Number(data?.shippingFee ?? 120),
          freeShippingThreshold: Number(data?.freeShippingThreshold ?? 2500),
          updatedAt: data?.updatedAt,
        });
      } catch (err) {
        if (!mounted) return;
        setShippingNotice({
          type: "error",
          message: err instanceof Error ? err.message : "Kargo ayarı alınamadı.",
        });
      } finally {
        if (!mounted) return;
        setShippingLoading(false);
      }
    }

    void loadShippingPricing();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadOrderAlertRecipients() {
      setOrderAlertLoading(true);
      setOrderAlertNotice(null);
      try {
        const response = await fetch("/api/admin/settings/order-alerts", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as
          | { recipients?: string[]; error?: string }
          | null;
        if (!response.ok) {
          throw new Error(data?.error ?? "Bildirim e-postaları alınamadı.");
        }
        if (!mounted) return;
        const recipients = Array.isArray(data?.recipients) ? data.recipients : [];
        setOrderAlertRecipients(recipients);
        setOrderAlertRecipientsText(recipients.join("\n"));
      } catch (err) {
        if (!mounted) return;
        setOrderAlertNotice({
          type: "error",
          message: err instanceof Error ? err.message : "Bildirim e-postaları alınamadı.",
        });
      } finally {
        if (!mounted) return;
        setOrderAlertLoading(false);
      }
    }

    void loadOrderAlertRecipients();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPaymentIbans() {
      setPaymentIbansLoading(true);
      setPaymentIbansNotice(null);
      try {
        const response = await fetch("/api/admin/settings/payment", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as
          | { ibans?: PaymentIbanFormRow[]; error?: string }
          | null;
        if (!response.ok) {
          throw new Error(data?.error ?? "IBAN bilgisi alınamadı.");
        }
        if (!mounted) return;
        const loadedRows =
          (data?.ibans ?? []).map((row, index) => ({
            id: String(row.id || `iban-${index + 1}`),
            label: String(row.label || `Hesap ${index + 1}`),
            accountHolderName: String(row.accountHolderName || row.label || "").trim(),
            iban: String(row.iban || "").trim(),
            usageCount: Number.isFinite(Number(row.usageCount)) ? Math.max(0, Math.trunc(Number(row.usageCount))) : 0,
            isActive: row.isActive !== false,
          })) || [];

        setPaymentIbans(
          loadedRows.length > 0
            ? loadedRows
            : [
                {
                  ...createIbanRow(0),
                  iban: DEFAULT_IBAN,
                  id: "default-iban",
                  label: "Varsayılan Hesap",
                  accountHolderName: "Hesap Sahibi",
                },
              ],
        );
      } catch (err) {
        if (!mounted) return;
        setPaymentIbansNotice({
          type: "error",
          message: err instanceof Error ? err.message : "IBAN bilgisi alınamadı.",
        });
      } finally {
        if (!mounted) return;
        setPaymentIbansLoading(false);
      }
    }

    void loadPaymentIbans();
    return () => {
      mounted = false;
    };
  }, []);

  function updatePaymentIbanRow(index: number, patch: Partial<PaymentIbanFormRow>) {
    setPaymentIbans((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addPaymentIbanRow() {
    setPaymentIbans((prev) => [...prev, createIbanRow(prev.length)]);
  }

  function removePaymentIbanRow(index: number) {
    setPaymentIbans((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function onSavePaymentIbans(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentIbansSaving(true);
    setPaymentIbansNotice(null);
    try {
      const normalizedRows = paymentIbans.map((row, index) => ({
        id: String(row.id || `iban-${index + 1}`),
        label: String(row.label || `Hesap ${index + 1}`),
        accountHolderName: String(row.accountHolderName || "").trim(),
        iban: String(row.iban || "").trim(),
        usageCount: Number.isFinite(Number(row.usageCount)) ? Math.max(0, Math.trunc(Number(row.usageCount))) : 0,
        isActive: row.isActive !== false,
      }));

      const response = await fetch("/api/admin/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ibans: normalizedRows }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ibans?: PaymentIbanFormRow[]; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "IBAN güncellenemedi.");
      }
      setPaymentIbans((data?.ibans as PaymentIbanFormRow[] | undefined) ?? normalizedRows);
      setPaymentIbansNotice({ type: "success", message: "IBAN havuzu güncellendi." });
    } catch (err) {
      setPaymentIbansNotice({
        type: "error",
        message: err instanceof Error ? err.message : "IBAN güncellenemedi.",
      });
    } finally {
      setPaymentIbansSaving(false);
    }
  }

  async function onSaveOrderAlerts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderAlertSaving(true);
    setOrderAlertNotice(null);
    try {
      const recipients = parseRecipientsInput(orderAlertRecipientsText);
      const response = await fetch("/api/admin/settings/order-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients }),
      });
      const data = (await response.json().catch(() => null)) as
        | { recipients?: string[]; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Bildirim e-postaları kaydedilemedi.");
      }
      const savedRecipients = Array.isArray(data?.recipients) ? data.recipients : recipients;
      setOrderAlertRecipients(savedRecipients);
      setOrderAlertRecipientsText(savedRecipients.join("\n"));
      setOrderAlertNotice({ type: "success", message: "Bildirim e-postaları güncellendi." });
    } catch (err) {
      setOrderAlertNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Bildirim e-postaları kaydedilemedi.",
      });
    } finally {
      setOrderAlertSaving(false);
    }
  }

  async function onSaveShippingPricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShippingSaving(true);
    setShippingNotice(null);
    try {
      const payload = {
        shippingFee: Math.max(0, Math.trunc(Number(shippingPricing.shippingFee || 0))),
        freeShippingThreshold: Math.max(0, Math.trunc(Number(shippingPricing.freeShippingThreshold || 0))),
      };

      const response = await fetch("/api/admin/settings/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as
        | { shippingFee?: number; freeShippingThreshold?: number; updatedAt?: string; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Kargo ayarı güncellenemedi.");
      }
      setShippingPricing({
        shippingFee: Number(data?.shippingFee ?? payload.shippingFee),
        freeShippingThreshold: Number(data?.freeShippingThreshold ?? payload.freeShippingThreshold),
        updatedAt: data?.updatedAt,
      });
      setShippingNotice({ type: "success", message: "Kargo ücret ayarı güncellendi." });
    } catch (err) {
      setShippingNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Kargo ayarı güncellenemedi.",
      });
    } finally {
      setShippingSaving(false);
    }
  }

  const orderStats = useMemo(() => {
    const byStatus: Record<OrderStatus, number> = {
      Beklemede: 0,
      "Ödeme Alındı": 0,
      "Sipariş Hazırlanıyor": 0,
      "Kargoya Verildi": 0,
      Tamamlandı: 0,
    };

    let revenue = 0;
    for (const order of orders) {
      byStatus[order.status] += 1;
      revenue += order.total;
    }

    const total = orders.length;
    const avg = total > 0 ? Math.round(revenue / total) : 0;
    const pending = byStatus["Beklemede"] + byStatus["Ödeme Alındı"];
    const inProgress = byStatus["Sipariş Hazırlanıyor"] + byStatus["Kargoya Verildi"];

    return { byStatus, total, revenue, avg, pending, inProgress };
  }, [orders]);

  const inventoryStats = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
    const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5);
    const outOfStock = products.filter((product) => product.stock <= 0);

    return {
      totalProducts,
      totalStock,
      lowStock,
      outOfStock,
      riskList: [...outOfStock, ...lowStock].slice(0, 8),
    };
  }, [products]);

  const supportStats = useMemo(() => {
    const total = supportRequests.length;
    const fresh = supportRequests.filter((item) => item.status === "Yeni").length;
    const active = supportRequests.filter((item) => item.status === "İnceleniyor").length;
    return { total, fresh, active };
  }, [supportRequests]);

  const recentOrdersTotalPages = useMemo(
    () => Math.max(1, Math.ceil(orders.length / RECENT_ORDERS_PAGE_SIZE)),
    [orders.length],
  );

  const safeRecentOrdersPage = Math.min(recentOrdersPage, recentOrdersTotalPages);

  const recentOrders = useMemo(() => {
    const start = (safeRecentOrdersPage - 1) * RECENT_ORDERS_PAGE_SIZE;
    const end = start + RECENT_ORDERS_PAGE_SIZE;
    return orders.slice(start, end);
  }, [orders, safeRecentOrdersPage]);

  const recentOrdersRangeText = useMemo(() => {
    if (orders.length === 0) return "0 / 0";
    const start = (safeRecentOrdersPage - 1) * RECENT_ORDERS_PAGE_SIZE + 1;
    const end = Math.min(safeRecentOrdersPage * RECENT_ORDERS_PAGE_SIZE, orders.length);
    return `${start}-${end} / ${orders.length}`;
  }, [orders.length, safeRecentOrdersPage]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="mb-6 rounded-2xl border border-[#D4AF37]/30 bg-[linear-gradient(140deg,rgba(212,175,55,0.13),rgba(12,12,12,0.9)_38%)] p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.24em] text-[#D4AF37]">OPERATIONS HUB</p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-300">Sipariş, gelir ve stok risklerini tek ekranda yönetin.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/orders"
              className="rounded-lg border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
            >
              Siparişler
            </Link>
            <Link
              href="/admin/products"
              className="rounded-lg border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
            >
              Ürün ve Stok
            </Link>
            <Link
              href="/admin/lookbook"
              className="rounded-lg border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
            >
              Lookbook
            </Link>
            <Link
              href="/admin/support-requests"
              className="rounded-lg border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
            >
              Talepler
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
          <button
            type="button"
            onClick={() => setIsPaymentPanelOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/20 bg-black/25 px-3 py-2 text-left transition hover:border-[#D4AF37]/35"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-100">Ödeme Ayarı</p>
              <p className="mt-1 text-xs text-zinc-400">Birden fazla IBAN ekleyin. Sistem siparişlerde az kullanılanı öncelikleyerek rastgele atar.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#D4AF37]/30 bg-black/20 px-3 py-1 text-xs text-zinc-300">
                Akıllı Dağıtım
              </span>
              <span className="text-xs text-[#D4AF37]">
                {isPaymentPanelOpen ? "Gizle" : "Göster"}
                <span
                  className={`ml-1 inline-block transition-transform duration-300 ${
                    isPaymentPanelOpen ? "rotate-180" : "rotate-0"
                  }`}
                >
                  ▼
                </span>
              </span>
            </div>
          </button>

          <div
            className={`grid overflow-hidden transition-all duration-300 ease-out ${
              isPaymentPanelOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!isPaymentPanelOpen}
          >
            <div className="min-h-0">
              <form onSubmit={onSavePaymentIbans} className="space-y-3">
                {paymentIbansLoading ? (
                  <div className="space-y-3">
                    <SkeletonRow />
                    <SkeletonRow />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentIbans.map((row, index) => (
                      <div key={`${row.id}-${index}`} className="rounded-xl border border-[#D4AF37]/20 bg-black/30 p-3">
                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            value={row.label}
                            onChange={(event) => updatePaymentIbanRow(index, { label: event.target.value })}
                            placeholder={`Hesap ${index + 1}`}
                            disabled={paymentIbansLoading || paymentIbansSaving}
                            className="w-full min-w-0 rounded-lg border border-[#D4AF37]/25 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#D4AF37]"
                          />
                          <input
                            value={row.accountHolderName}
                            onChange={(event) => updatePaymentIbanRow(index, { accountHolderName: event.target.value })}
                            placeholder="Ad Soyad"
                            disabled={paymentIbansLoading || paymentIbansSaving}
                            className="w-full min-w-0 rounded-lg border border-[#D4AF37]/25 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#D4AF37]"
                          />
                          <input
                            value={row.iban}
                            onChange={(event) => updatePaymentIbanRow(index, { iban: event.target.value })}
                            placeholder="TR00 0000 0000 0000 0000 0000 00"
                            disabled={paymentIbansLoading || paymentIbansSaving}
                            className="w-full min-w-0 rounded-lg border border-[#D4AF37]/25 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#D4AF37] md:col-span-2"
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                            <input
                              type="checkbox"
                              checked={row.isActive}
                              onChange={(event) => updatePaymentIbanRow(index, { isActive: event.target.checked })}
                              disabled={paymentIbansLoading || paymentIbansSaving}
                            />
                            Aktif
                          </label>
                          <span className="rounded-full border border-[#D4AF37]/25 bg-black/25 px-2 py-1 text-[11px] text-zinc-300">
                            Kullanım: {row.usageCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePaymentIbanRow(index)}
                            disabled={paymentIbans.length <= 1 || paymentIbansLoading || paymentIbansSaving}
                            className="ml-auto rounded-lg border border-red-400/35 px-3 py-1.5 text-xs text-red-200 disabled:opacity-40"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={addPaymentIbanRow}
                    disabled={paymentIbansLoading || paymentIbansSaving}
                    className="rounded-lg border border-[#D4AF37]/35 px-4 py-2 text-xs text-[#D4AF37] transition hover:bg-[#D4AF37]/10 disabled:opacity-40"
                  >
                    + IBAN Ekle
                  </button>
                  <button
                    type="submit"
                    disabled={paymentIbansLoading || paymentIbansSaving}
                    className="rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {paymentIbansSaving ? "Kaydediliyor..." : "IBAN Havuzunu Kaydet"}
                  </button>
                  {paymentIbansLoading && <InlineLoader label="IBAN havuzu yükleniyor..." />}
                </div>
              </form>

              {paymentIbansNotice && (
                <div
                  className={`mt-4 rounded-xl border p-3 text-sm ${
                    paymentIbansNotice.type === "success"
                      ? "border-emerald-400/35 bg-emerald-900/20 text-emerald-200"
                      : "border-red-400/35 bg-red-950/20 text-red-200"
                  }`}
                >
                  {paymentIbansNotice.message}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
          <button
            type="button"
            onClick={() => setIsOrderAlertPanelOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/20 bg-black/25 px-3 py-2 text-left transition hover:border-[#D4AF37]/35"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-100">Sipariş Bildirim E-postaları</p>
              <p className="mt-1 text-xs text-zinc-400">Yeni sipariş geldiğinde aşağıdaki tüm adreslere bildirim gider.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#D4AF37]/30 bg-black/20 px-3 py-1 text-xs text-zinc-300">
                Çoklu Alıcı
              </span>
              <span className="text-xs text-[#D4AF37]">
                {isOrderAlertPanelOpen ? "Gizle" : "Göster"}
                <span
                  className={`ml-1 inline-block transition-transform duration-300 ${
                    isOrderAlertPanelOpen ? "rotate-180" : "rotate-0"
                  }`}
                >
                  ▼
                </span>
              </span>
            </div>
          </button>

          <div
            className={`grid overflow-hidden transition-all duration-300 ease-out ${
              isOrderAlertPanelOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!isOrderAlertPanelOpen}
          >
            <div className="min-h-0">
              <form onSubmit={onSaveOrderAlerts} className="space-y-3">
                <label className="block text-xs tracking-[0.2em] text-[#D4AF37]" htmlFor="dashboard-order-alert-emails">
                  E-posta Listesi
                </label>
                {orderAlertLoading ? (
                  <div className="space-y-2">
                    <div className="h-6 w-40 animate-pulse rounded bg-zinc-800/70" />
                    <div className="h-28 w-full animate-pulse rounded-xl bg-zinc-800/70" />
                  </div>
                ) : (
                  <textarea
                    id="dashboard-order-alert-emails"
                    value={orderAlertRecipientsText}
                    onChange={(event) => setOrderAlertRecipientsText(event.target.value)}
                    placeholder={"mail1@domain.com\nmail2@domain.com"}
                    disabled={orderAlertLoading || orderAlertSaving}
                    rows={5}
                    className="w-full rounded-xl border border-[#D4AF37]/30 bg-black/35 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={orderAlertLoading || orderAlertSaving}
                    className="rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {orderAlertSaving ? "Kaydediliyor..." : "Listeyi Kaydet"}
                  </button>
                  {orderAlertLoading && <InlineLoader label="Adresler yükleniyor..." />}
                </div>
              </form>

              {orderAlertRecipients.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {orderAlertRecipients.map((recipient) => (
                    <span
                      key={recipient}
                      className="rounded-full border border-[#D4AF37]/30 bg-black/25 px-3 py-1 text-xs text-zinc-200"
                    >
                      {recipient}
                    </span>
                  ))}
                </div>
              )}

              {orderAlertNotice && (
                <div
                  className={`mt-4 rounded-xl border p-3 text-sm ${
                    orderAlertNotice.type === "success"
                      ? "border-emerald-400/35 bg-emerald-900/20 text-emerald-200"
                      : "border-red-400/35 bg-red-950/20 text-red-200"
                  }`}
                >
                  {orderAlertNotice.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Kargo Ücret Ayarı</p>
            <p className="mt-1 text-xs text-zinc-400">
              Sepet ve checkout sayfalarında gösterilen kargo ücreti ve ücretsiz kargo eşiğini buradan yönet.
            </p>
          </div>
          {shippingPricing.updatedAt && (
            <p className="text-xs text-zinc-500">
              Son güncelleme: {new Date(shippingPricing.updatedAt).toLocaleString("tr-TR")}
            </p>
          )}
        </div>

        <form onSubmit={onSaveShippingPricing} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block text-sm text-zinc-300">
            Kargo Ücreti (TL)
            <input
              type="number"
              min={0}
              step={1}
              value={shippingPricing.shippingFee}
              onChange={(event) =>
                setShippingPricing((prev) => ({
                  ...prev,
                  shippingFee: Number(event.target.value),
                }))
              }
              disabled={shippingLoading || shippingSaving}
              className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#D4AF37]"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            Ücretsiz Kargo Eşiği (TL)
            <input
              type="number"
              min={0}
              step={1}
              value={shippingPricing.freeShippingThreshold}
              onChange={(event) =>
                setShippingPricing((prev) => ({
                  ...prev,
                  freeShippingThreshold: Number(event.target.value),
                }))
              }
              disabled={shippingLoading || shippingSaving}
              className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#D4AF37]"
            />
          </label>

          <button
            type="submit"
            disabled={shippingLoading || shippingSaving}
            className="rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {shippingSaving ? "Kaydediliyor..." : "Kargo Ayarını Kaydet"}
          </button>
        </form>

        {shippingLoading && <div className="mt-3 text-xs text-zinc-400">Kargo ayarı yükleniyor...</div>}
        {shippingNotice && (
          <div
            className={`mt-3 rounded-xl border p-3 text-sm ${
              shippingNotice.type === "success"
                ? "border-emerald-400/35 bg-emerald-900/20 text-emerald-200"
                : "border-red-400/35 bg-red-950/20 text-red-200"
            }`}
          >
            {shippingNotice.message}
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
          <p className="text-xs tracking-[0.22em] text-[#D4AF37]">TOPLAM SİPARİŞ</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{loading ? "…" : orderStats.total}</p>
        </div>
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
          <p className="text-xs tracking-[0.22em] text-[#D4AF37]">TOPLAM CİRO</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">
            {loading ? "…" : `${orderStats.revenue.toLocaleString("tr-TR")} TL`}
          </p>
        </div>
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
          <p className="text-xs tracking-[0.22em] text-[#D4AF37]">ORT. SEPET</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">
            {loading ? "…" : `${orderStats.avg.toLocaleString("tr-TR")} TL`}
          </p>
        </div>
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
          <p className="text-xs tracking-[0.22em] text-[#D4AF37]">TOPLAM STOK</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{loading ? "…" : inventoryStats.totalStock}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
          <p className="text-xs tracking-[0.22em] text-amber-200">KRİTİK STOK</p>
          <p className="mt-2 text-3xl font-semibold text-amber-100">{loading ? "…" : inventoryStats.lowStock.length}</p>
        </div>
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
          <p className="text-xs tracking-[0.22em] text-red-200">STOKSUZ ÜRÜN</p>
          <p className="mt-2 text-3xl font-semibold text-red-100">{loading ? "…" : inventoryStats.outOfStock.length}</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-5">
          <p className="text-xs tracking-[0.22em] text-cyan-200">YENİ TALEP</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-100">{loading ? "…" : supportStats.fresh}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-100">Sipariş Durum Dağılımı</p>
            <Link href="/admin/orders" className="text-sm text-[#D4AF37] hover:underline">Detaya Git →</Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {statuses.map((status) => {
              const meta = statusMeta(status);
              const value = loading ? "…" : orderStats.byStatus[status];
              return (
                <div key={status} className="rounded-xl border border-[#D4AF37]/15 bg-black/25 p-4">
                  <div className={`inline-flex rounded-full border px-3 py-1 text-xs ${meta.className}`}>{meta.label}</div>
                  <p className="mt-3 text-2xl font-semibold text-zinc-100">{value}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#D4AF37]/15 bg-black/25 p-4">
              <p className="text-xs tracking-[0.2em] text-[#D4AF37]">BEKLEYEN</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{loading ? "…" : orderStats.pending}</p>
            </div>
            <div className="rounded-xl border border-[#D4AF37]/15 bg-black/25 p-4">
              <p className="text-xs tracking-[0.2em] text-[#D4AF37]">DEVAM EDEN</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{loading ? "…" : orderStats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-100">Stok Alarmı</p>
            <Link href="/admin/products" className="text-sm text-[#D4AF37] hover:underline">Stok Yönet →</Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-zinc-400">Yükleniyor...</div>
          ) : inventoryStats.riskList.length === 0 ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-200">
              Harika, kritik seviyede ürün bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {inventoryStats.riskList.map((product) => {
                const out = product.stock <= 0;
                return (
                  <div key={product.slug} className="rounded-xl border border-[#D4AF37]/20 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-100">{product.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">{product.category} • {product.collection}</p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] ${
                          out
                            ? "border-red-400/35 bg-red-500/10 text-red-200"
                            : "border-amber-400/40 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        {out ? "TÜKENDİ" : "KRİTİK"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-200">Stok: {product.stock}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Son Siparişler</p>
            <p className="mt-1 text-xs text-zinc-400">Liste: {recentOrdersRangeText}</p>
          </div>
          <Link href="/admin/orders" className="text-sm text-[#D4AF37] hover:underline">Tümünü Gör →</Link>
        </div>

        {error && <div className="rounded-xl border border-red-400/30 bg-red-950/20 p-4 text-red-200">{error}</div>}
        {loading && !error && <div className="py-10 text-center text-zinc-400">Yükleniyor...</div>}
        {!loading && !error && recentOrders.length === 0 && (
          <div className="py-10 text-center text-zinc-400">Henüz sipariş yok.</div>
        )}

        {!loading && !error && recentOrders.length > 0 && (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const meta = statusMeta(order.status);
              return (
                <div key={order._id} className="rounded-xl border border-[#D4AF37]/20 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs tracking-[0.2em] text-[#D4AF37]">#{order._id}</p>
                      <p className="mt-1 font-semibold text-zinc-100">{order.shipping.fullName}</p>
                      <p className="mt-1 text-sm text-zinc-400">{order.shipping.city} / {order.shipping.country}</p>
                      <p className="mt-1 text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString("tr-TR")}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-2 text-xs ${meta.className}`}>{meta.label}</span>
                      <span className="rounded-full border border-[#D4AF37]/30 bg-black/20 px-3 py-2 text-xs text-zinc-200">
                        {order.items.length} ürün
                      </span>
                      <span className="rounded-full border border-[#D4AF37]/30 bg-black/20 px-3 py-2 text-xs font-semibold text-[#D4AF37]">
                        {order.total.toLocaleString("tr-TR")} TL
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {recentOrdersTotalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/20 bg-black/20 p-3">
                <p className="text-xs text-zinc-400">
                  Sayfa {safeRecentOrdersPage} / {recentOrdersTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRecentOrdersPage(Math.max(1, safeRecentOrdersPage - 1))}
                    disabled={safeRecentOrdersPage <= 1}
                    className="rounded-lg border border-[#D4AF37]/35 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecentOrdersPage(Math.min(recentOrdersTotalPages, safeRecentOrdersPage + 1))}
                    disabled={safeRecentOrdersPage >= recentOrdersTotalPages}
                    className="rounded-lg border border-[#D4AF37]/35 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-100">İletişim Talepleri</p>
            <p className="mt-1 text-xs text-zinc-400">
              Toplam: {supportStats.total} • Yeni: {supportStats.fresh} • İnceleniyor: {supportStats.active}
            </p>
          </div>
          <Link href="/admin/support-requests" className="text-sm text-[#D4AF37] hover:underline">
            Talepleri Yönet →
          </Link>
        </div>

        {loading && <div className="py-6 text-center text-zinc-400">Yükleniyor...</div>}
        {!loading && supportRequests.length === 0 && (
          <div className="rounded-xl border border-[#D4AF37]/20 bg-black/20 p-4 text-sm text-zinc-400">
            Henüz destek talebi yok.
          </div>
        )}

        {!loading && supportRequests.length > 0 && (
          <div className="space-y-2">
            {supportRequests.slice(0, 3).map((request) => (
              <article key={request._id} className="rounded-xl border border-[#D4AF37]/20 bg-black/20 p-3">
                <p className="text-xs tracking-[0.2em] text-[#D4AF37]">#{request._id}</p>
                <p className="mt-1 text-sm text-zinc-200">
                  {request.userName} • {request.subject}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(request.createdAt).toLocaleString("tr-TR")}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
