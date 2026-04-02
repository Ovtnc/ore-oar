import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { assignLeastUsedPriorityRandomIban } from "@/lib/db-payment-settings";
import { getOrderById, updateOrderFields } from "@/lib/db-orders";
import { Order } from "@/lib/types";

type QuickMessageType = "iban_and_receipt" | "payment_not_received" | "order_created";

function normalizePhoneForWhatsapp(input: unknown) {
  let value = String(input ?? "")
    .trim()
    .replace(/[^\d+]/g, "");
  if (!value) return "";
  if (value.startsWith("+")) value = value.slice(1);
  value = value.replace(/\D/g, "");

  if (value.startsWith("0")) {
    value = `90${value.slice(1)}`;
  } else if (value.startsWith("5") && value.length === 10) {
    value = `90${value}`;
  }
  return value;
}

function formatCurrency(value: unknown) {
  return `${Number(value ?? 0).toLocaleString("tr-TR")} TL`;
}

function parseMessageType(input: unknown): QuickMessageType {
  const value = String(input ?? "").trim();
  if (value === "payment_not_received") return "payment_not_received";
  if (value === "order_created") return "order_created";
  return "iban_and_receipt";
}

function buildMessage(order: Order, orderId: string, type: QuickMessageType, paymentInfo?: {
  iban: string;
  label: string;
  accountHolderName: string;
}) {
  const customerName = order.shipping?.fullName || "Değerli müşterimiz";
  const total = formatCurrency(order.total);

  if (type === "payment_not_received") {
    return [
      `Merhaba ${customerName},`,
      `#${orderId} numaralı siparişiniz için henüz ödeme dekontu tarafımıza ulaşmadı.`,
      "Müsait olduğunuzda ödemenizi tamamlayıp dekontu bu sohbetten paylaşabilir misiniz?",
      "Teşekkürler.",
    ].join("\n");
  }

  if (type === "order_created") {
    return [
      `Merhaba ${customerName},`,
      `#${orderId} numaralı siparişiniz oluşturuldu.`,
      "Sipariş durumunu hesabınızdaki “Siparişlerim” sayfasından takip edebilirsiniz.",
      "Teşekkür ederiz.",
    ].join("\n");
  }

  return [
    `Merhaba ${customerName},`,
    `#${orderId} numaralı siparişiniz için ödeme bilgileri:`,
    paymentInfo?.label ? `Hesap: ${paymentInfo.label}` : "Hesap: Oar & Ore",
    paymentInfo?.accountHolderName ? `Alıcı: ${paymentInfo.accountHolderName}` : "",
    `IBAN: ${paymentInfo?.iban ?? "-"}`,
    `Toplam Tutar: ${total}`,
    "Ödeme sonrası dekontu bu sohbetten paylaşmanızı rica ederiz.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { type?: string } | null;
  const type = parseMessageType(body?.type);

  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const phone = normalizePhoneForWhatsapp(order.shipping?.phone);
  if (!phone) {
    return NextResponse.json({ error: "Siparişte geçerli telefon numarası yok." }, { status: 400 });
  }

  let paymentInfo:
    | {
        iban: string;
        label: string;
        accountHolderName: string;
      }
    | undefined;

  if (type === "iban_and_receipt") {
    const selected = await assignLeastUsedPriorityRandomIban();
    paymentInfo = {
      iban: selected.iban,
      label: selected.label,
      accountHolderName: selected.accountHolderName,
    };

    await updateOrderFields(id, {
      paymentIban: selected.iban,
      paymentIbanId: selected.id,
      paymentIbanLabel: selected.label,
      paymentIbanAccountHolder: selected.accountHolderName,
    });
  }

  const message = buildMessage(order, id, type, paymentInfo);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return NextResponse.json({
    ok: true,
    type,
    whatsappUrl,
    phone,
    message,
    paymentIban: paymentInfo?.iban ?? null,
    paymentIbanLabel: paymentInfo?.label ?? null,
  });
}
