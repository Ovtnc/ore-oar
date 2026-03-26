import nodemailer from "nodemailer";
import { Resend } from "resend";
import { normalizeEmail } from "@/lib/auth";
import { fetchOrderAlertRecipients } from "@/lib/db-order-alert-settings";
import { Order, OrderStatus, SupportRequest } from "@/lib/types";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(value: unknown) {
  return `${Number(value ?? 0).toLocaleString("tr-TR")} TL`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("tr-TR");
}

function statusPill(status: string) {
  const normalized = escapeHtml(status);
  return `<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#11161f;border:1px solid rgba(212,175,55,0.35);color:#f3d47b;font-size:12px;line-height:1">${normalized}</span>`;
}

function buildEmailLayout(input: {
  preheader: string;
  title: string;
  subtitle: string;
  metaLabel: string;
  metaValue: string;
  contentHtml: string;
}) {
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f1e6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1a1a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f1e6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #e7d6ab;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 18px;background:linear-gradient(180deg,#fff6df,#fffdf6);border-bottom:1px solid #eddcb1;">
                <div style="font-size:11px;letter-spacing:0.22em;color:#9f7922;text-transform:uppercase;">OAR & ORE</div>
                <h1 style="margin:10px 0 6px;font-size:28px;line-height:1.2;color:#1c1c1c;">${escapeHtml(input.title)}</h1>
                <p style="margin:0;color:#5f5f5f;font-size:14px;line-height:1.5;">${escapeHtml(input.subtitle)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e8d6a8;background:#fffaf0;border-radius:12px;">
                  <tr>
                    <td style="padding:12px 14px;">
                      <div style="font-size:11px;letter-spacing:0.18em;color:#8b8b8b;text-transform:uppercase;">${escapeHtml(input.metaLabel)}</div>
                      <div style="margin-top:6px;font-size:15px;color:#8f6b19;font-weight:600;">${escapeHtml(input.metaValue)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 8px;">${input.contentHtml}</td>
            </tr>
            <tr>
              <td style="padding:18px 24px 24px;color:#8a8a8a;font-size:12px;line-height:1.5;border-top:1px solid #efdfba;">
                Bu e-posta Oar & Ore sipariş süreci kapsamında otomatik oluşturulmuştur.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildOrderRows(order: Order) {
  return order.items
    .map((item) => {
      const itemName = `${escapeHtml(item.name)}${item.coatingName ? ` (${escapeHtml(item.coatingName)})` : ""}`;
      const quantity = Number(item.quantity ?? 0);
      const lineTotal = Number(item.price ?? 0) * quantity;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #efdfbb;font-size:14px;color:#232323;">${itemName}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #efdfbb;font-size:13px;color:#666666;text-align:center;">${quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #efdfbb;font-size:13px;color:#8f6b19;text-align:right;">${formatCurrency(lineTotal)}</td>
      </tr>`;
    })
    .join("");
}

function buildOrderHtml(order: Order, orderId: string) {
  const contentHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
      <tr>
        <td style="padding:0 0 8px;color:#4f4f4f;font-size:14px;">Durum: ${statusPill(order.status)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 6px;color:#4f4f4f;font-size:14px;"><b style="color:#222;">Müşteri:</b> ${escapeHtml(order.shipping.fullName)} (${escapeHtml(order.shipping.email)})</td>
      </tr>
      <tr>
        <td style="padding:0 0 6px;color:#4f4f4f;font-size:14px;"><b style="color:#222;">Tarih:</b> ${escapeHtml(formatDate(order.createdAt))}</td>
      </tr>
      <tr>
        <td style="padding:0 0 6px;color:#4f4f4f;font-size:14px;"><b style="color:#222;">Teslimat:</b> ${escapeHtml(order.shipping.address)}, ${escapeHtml(order.shipping.city)}, ${escapeHtml(order.shipping.country)}</td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e8d6a8;border-radius:12px;overflow:hidden;background:#fffdf8;">
      <tr>
        <th style="padding:10px 12px;text-align:left;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#7b7b7b;border-bottom:1px solid #ead9b0;">Ürün</th>
        <th style="padding:10px 12px;text-align:center;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#7b7b7b;border-bottom:1px solid #ead9b0;">Adet</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#7b7b7b;border-bottom:1px solid #ead9b0;">Tutar</th>
      </tr>
      ${buildOrderRows(order)}
    </table>

    <div style="margin-top:12px;text-align:right;color:#8f6b19;font-size:18px;font-weight:700;">
      Toplam: ${formatCurrency(order.total)}
    </div>
  `;

  return buildEmailLayout({
    preheader: `Yeni sipariş alındı #${orderId}`,
    title: "Yeni Sipariş Alındı",
    subtitle: "Atölye panelinden sipariş detaylarını inceleyip hazırlık sürecini başlatabilirsiniz.",
    metaLabel: "Sipariş No",
    metaValue: orderId,
    contentHtml,
  });
}

function buildOrderStatusHtml(order: Order, orderId: string, nextStatus: OrderStatus) {
  const contentHtml = `
    <p style="margin:0 0 12px;color:#4f4f4f;font-size:14px;line-height:1.6;">
      Merhaba <b style="color:#222;">${escapeHtml(order.shipping.fullName)}</b>, siparişinizin durumu güncellendi.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;border:1px solid #e8d6a8;border-radius:12px;overflow:hidden;background:#fffdf8;">
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;"><b style="color:#222;">Yeni Durum:</b> ${statusPill(nextStatus)}</td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:#4f4f4f;font-size:14px;"><b style="color:#222;">Toplam:</b> ${formatCurrency(order.total)}</p>
    <p style="margin:0 0 8px;color:#4f4f4f;font-size:14px;"><b style="color:#222;">Teslimat:</b> ${escapeHtml(order.shipping.address)}, ${escapeHtml(order.shipping.city)}, ${escapeHtml(order.shipping.country)}</p>
    <p style="margin:0;color:#6e6e6e;font-size:13px;line-height:1.6;">
      Siparişinizin kalan adımlarını hesabınızdaki <b style="color:#8f6b19;">Siparişlerim</b> sayfasından takip edebilirsiniz.
    </p>
  `;

  return buildEmailLayout({
    preheader: `Sipariş durumunuz güncellendi #${orderId}`,
    title: "Sipariş Durumu Güncellendi",
    subtitle: "Sipariş sürecinizle ilgili en güncel bilgi aşağıdadır.",
    metaLabel: "Sipariş No",
    metaValue: orderId,
    contentHtml,
  });
}

type ReminderTone = "gentle" | "urgent";

function buildPaymentReminderHtml(order: Order, orderId: string, tone: ReminderTone) {
  const isUrgent = tone === "urgent";
  const title = isUrgent ? "Ödeme Hatırlatması" : "Nazik Ödeme Hatırlatması";
  const subtitle = isUrgent
    ? "Siparişiniz için ödeme bildirimi henüz alınamadı."
    : "Siparişiniz hazırlık sırasına alınabilmesi için ödeme bildirimi bekleniyor.";
  const intro = isUrgent
    ? "Siparişinizi gecikmeden hazırlık aşamasına alabilmemiz için lütfen ödemenizi tamamlayıp bildiriniz."
    : "Siparişinizi hazırlığa alabilmemiz için uygun olduğunuzda ödemenizi tamamlayıp bildiriminizi paylaşabilirsiniz.";

  const contentHtml = `
    <p style="margin:0 0 12px;color:#4f4f4f;font-size:14px;line-height:1.6;">
      Merhaba <b style="color:#222;">${escapeHtml(order.shipping.fullName)}</b>, ${escapeHtml(intro)}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;border:1px solid #e8d6a8;border-radius:12px;overflow:hidden;background:#fffdf8;">
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;"><b style="color:#222;">Sipariş Durumu:</b> ${statusPill(order.status)}</td>
      </tr>
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;border-top:1px solid #efdfbb;"><b style="color:#222;">Toplam:</b> ${formatCurrency(order.total)}</td>
      </tr>
    </table>
    <p style="margin:0;color:#6e6e6e;font-size:13px;line-height:1.6;">
      Ödeme yaptıktan sonra <b style="color:#8f6b19;">Ödemeyi Yaptım</b> adımını tamamlayarak süreci hızlandırabilirsiniz.
    </p>
  `;

  return buildEmailLayout({
    preheader: `Siparişiniz için ödeme hatırlatması #${orderId}`,
    title,
    subtitle,
    metaLabel: "Sipariş No",
    metaValue: orderId,
    contentHtml,
  });
}

function buildPaymentNotifiedByCustomerHtml(order: Order, orderId: string) {
  const contentHtml = `
    <p style="margin:0 0 12px;color:#4f4f4f;font-size:14px;line-height:1.6;">
      Müşteri <b style="color:#222;">${escapeHtml(order.shipping.fullName)}</b> ödeme yaptığını bildirdi.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;border:1px solid #e8d6a8;border-radius:12px;overflow:hidden;background:#fffdf8;">
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;">
          <b style="color:#222;">Sipariş Durumu:</b> ${statusPill(order.status)}
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;border-top:1px solid #efdfbb;">
          <b style="color:#222;">Toplam:</b> ${formatCurrency(order.total)}
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;border-top:1px solid #efdfbb;">
          <b style="color:#222;">Müşteri:</b> ${escapeHtml(order.shipping.fullName)} (${escapeHtml(order.shipping.email)})
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#6e6e6e;font-size:13px;line-height:1.6;">
      Admin panelden siparişi açıp dekont teyidini tamamlayarak durumu <b style="color:#8f6b19;">Ödeme Alındı</b> adımına taşıyabilirsiniz.
    </p>
  `;

  return buildEmailLayout({
    preheader: `Müşteri ödeme bildirimi yaptı #${orderId}`,
    title: "Ödeme Bildirimi Alındı",
    subtitle: "Sipariş için müşteri tarafından ödeme bildirimi yapıldı.",
    metaLabel: "Sipariş No",
    metaValue: orderId,
    contentHtml,
  });
}

function buildSupportRequestHtml(input: {
  request: SupportRequest;
  requestId: string;
}) {
  const { request, requestId } = input;
  const contentHtml = `
    <p style="margin:0 0 12px;color:#4f4f4f;font-size:14px;line-height:1.6;">
      Sipariş ile ilgili yeni bir destek talebi oluşturuldu.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;border:1px solid #e8d6a8;border-radius:12px;overflow:hidden;background:#fffdf8;">
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;">
          <b style="color:#222;">Müşteri:</b> ${escapeHtml(request.userName)} (${escapeHtml(request.userEmail)})
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;border-top:1px solid #efdfbb;">
          <b style="color:#222;">Sipariş No:</b> ${escapeHtml(request.orderId)}
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;border-top:1px solid #efdfbb;">
          <b style="color:#222;">Ürün:</b> ${escapeHtml(request.productName)}${request.productVariant ? ` (${escapeHtml(request.productVariant)})` : ""}
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;border-top:1px solid #efdfbb;">
          <b style="color:#222;">Konu:</b> ${escapeHtml(request.subject)}
        </td>
      </tr>
    </table>
    <div style="border:1px solid #e8d6a8;border-radius:12px;background:#fffaf0;padding:12px 14px;">
      <div style="font-size:11px;letter-spacing:0.18em;color:#8b8b8b;text-transform:uppercase;margin-bottom:8px;">Müşteri Mesajı</div>
      <p style="margin:0;color:#323232;font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(request.message)}</p>
    </div>
  `;

  return buildEmailLayout({
    preheader: `Yeni destek talebi #${requestId}`,
    title: "Yeni Destek Talebi",
    subtitle: "Müşteri siparişle ilgili bir talep oluşturdu. Admin panelden inceleyebilirsiniz.",
    metaLabel: "Talep No",
    metaValue: requestId,
    contentHtml,
  });
}

function buildSupportReplyHtml(input: {
  request: SupportRequest;
  requestId: string;
  replyMessage: string;
}) {
  const { request, requestId, replyMessage } = input;

  const contentHtml = `
    <p style="margin:0 0 12px;color:#4f4f4f;font-size:14px;line-height:1.6;">
      Merhaba <b style="color:#222;">${escapeHtml(request.userName)}</b>, destek talebinize yanıtımız aşağıdadır.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;border:1px solid #e8d6a8;border-radius:12px;overflow:hidden;background:#fffdf8;">
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;">
          <b style="color:#222;">Sipariş No:</b> ${escapeHtml(request.orderId)}
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#4f4f4f;border-top:1px solid #efdfbb;">
          <b style="color:#222;">Konu:</b> ${escapeHtml(request.subject)}
        </td>
      </tr>
    </table>
    <div style="border:1px solid #e8d6a8;border-radius:12px;background:#fffaf0;padding:12px 14px;">
      <div style="font-size:11px;letter-spacing:0.18em;color:#8b8b8b;text-transform:uppercase;margin-bottom:8px;">Yanıtımız</div>
      <p style="margin:0;color:#323232;font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(replyMessage)}</p>
    </div>
  `;

  return buildEmailLayout({
    preheader: `Destek talebinize yanıt verildi #${requestId}`,
    title: "Destek Talebinize Yanıt",
    subtitle: "Talebiniz için ekibimizin dönüşü aşağıda yer alıyor.",
    metaLabel: "Talep No",
    metaValue: requestId,
    contentHtml,
  });
}

async function sendEmail(recipients: string[], subject: string, html: string) {
  if (recipients.length === 0) return;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();

  if (resendKey) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.MAIL_FROM ?? "onboarding@resend.dev",
      to: recipients,
      subject,
      html,
    });
    return;
  }

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("Mail servisi yapılandırılmamış. RESEND_API_KEY veya SMTP ayarlarını tanımlayın.");
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    // SMTP'de gönderici olarak SMTP hesabını kullanmak daha uyumlu olur.
    from: smtpUser,
    to: recipients,
    subject,
    html,
  });
}

export async function sendOrderNotification(order: Order, orderId: string) {
  const recipients = await fetchOrderAlertRecipients();

  if (recipients.length === 0) {
    return;
  }

  const subject = `Oar & Ore - Yeni bekleyen sipariş (${orderId})`;
  const html = buildOrderHtml(order, orderId);
  await sendEmail(recipients, subject, html);
}

export async function sendOrderStatusUpdateToCustomer(
  order: Order,
  orderId: string,
  nextStatus: OrderStatus,
) {
  const recipients = Array.from(
    new Set(
      [order.userEmail, order.shipping.email]
        .map((value) => normalizeEmail(String(value ?? "")))
        .filter(Boolean),
    ),
  );
  if (recipients.length === 0) return;

  const subject = `Oar & Ore - Sipariş durumunuz güncellendi (#${orderId})`;
  const html = buildOrderStatusHtml(order, orderId, nextStatus);
  await sendEmail(recipients, subject, html);
}

export async function sendPaymentReminderToCustomer(
  order: Order,
  orderId: string,
  tone: ReminderTone = "gentle",
) {
  const recipients = Array.from(
    new Set(
      [order.userEmail, order.shipping.email]
        .map((value) => normalizeEmail(String(value ?? "")))
        .filter(Boolean),
    ),
  );
  if (recipients.length === 0) return;

  const subject =
    tone === "urgent"
      ? `Oar & Ore - Siparişiniz için ödeme hatırlatması (#${orderId})`
      : `Oar & Ore - Nazik ödeme hatırlatması (#${orderId})`;
  const html = buildPaymentReminderHtml(order, orderId, tone);
  await sendEmail(recipients, subject, html);
}

export async function sendSupportRequestNotification(request: SupportRequest, requestId: string) {
  const recipients = await fetchOrderAlertRecipients();
  if (recipients.length === 0) return;

  const subject = `Oar & Ore - Yeni destek talebi (${request.orderId})`;
  const html = buildSupportRequestHtml({ request, requestId });
  await sendEmail(recipients, subject, html);
}

export async function sendSupportReplyToCustomer(
  request: SupportRequest,
  requestId: string,
  replyMessage: string,
  extraRecipients: string[] = [],
) {
  const recipients = Array.from(
    new Set(
      [request.userEmail, ...extraRecipients]
        .map((value) => normalizeEmail(String(value ?? "")))
        .filter(Boolean),
    ),
  );
  if (recipients.length === 0) {
    throw new Error("Müşteri e-posta adresi bulunamadı.");
  }

  const subject = `Oar & Ore - Destek talebinize yanıt (${request.orderId})`;
  const html = buildSupportReplyHtml({ request, requestId, replyMessage });
  await sendEmail(recipients, subject, html);
}

export async function sendPaymentNotificationToAdmin(order: Order, orderId: string) {
  const recipients = await fetchOrderAlertRecipients();
  if (recipients.length === 0) return;

  const subject = `Oar & Ore - Müşteri ödeme bildirimi yaptı (#${orderId})`;
  const html = buildPaymentNotifiedByCustomerHtml(order, orderId);
  await sendEmail(recipients, subject, html);
}
