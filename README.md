# Oar & Ore

Atölye üretim takı e-ticaret uygulaması.

## Özellikler

- Ürün listeleme ve ürün detay sayfaları
- Çoklu ürün görseli, kaplama opsiyonu ve fiyat farkı
- Sepet, checkout, ödeme bildirimi akışı
- WhatsApp dekont gönderimi + n8n ile ödeme doğrulama otomasyonu
- Üyelik sistemi (giriş/üye ol/oturum)
- `Siparişlerim` ve sipariş durum takibi
- Contact Us / destek talebi oluşturma
- Admin panel:
  - Sipariş yönetimi
  - Ürün/stok yönetimi
  - Lookbook yönetimi
  - Ödeme (IBAN havuzu) yönetimi
  - Kargo ücretlendirme yönetimi
  - Destek talepleri yönetimi (hızlı cevap + özel cevap e-postası)

## Teknoloji

- Next.js 16 (App Router)
- React 19
- Tailwind CSS
- PostgreSQL + Prisma
- Resend veya SMTP (Nodemailer) ile mail

## Kurulum

1. Bağımlılıkları yükleyin:

```bash
npm install
```

2. Ortam değişkenlerini kopyalayın:

```bash
cp .env.example .env
```

3. Gerekli env değerlerini doldurun (`DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, mail ayarları).

4. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

5. Uygulama: [http://localhost:3000](http://localhost:3000)

## Scriptler

- `npm run dev`: geliştirme
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript kontrolü
- `npm run build`: production build
- `npm run check`: lint + build
- `npm run prisma:migrate:dev`: local migration oluştur + uygula
- `npm run prisma:migrate:deploy`: production migration uygula
- `npm run migrate:mongo-to-postgres`: Mongo verisini PostgreSQL'e aktar
- `npm run admin:setup`: `.env` içindeki admin kullanıcıyı oluştur/güncelle
- `npm run test:api:smoke`: PostgreSQL üzerinde uçtan uca temel API smoke testi

## Admin Erişimi

- Admin erişimi e-posta bazlıdır.
- Oturum açmış kullanıcının e-postası `ADMIN_ALLOWED_EMAIL` (veya fallback `ADMIN_EMAIL`) ile eşleşiyorsa `/admin` ve `/api/admin` erişimi açılır.

## Mail Altyapısı

- `RESEND_API_KEY` varsa Resend kullanılır.
- Yoksa `SMTP_*` ayarları ile SMTP kullanılır.
- Sipariş, durum güncelleme, ödeme hatırlatma, destek talebi ve destek yanıtı mailleri desteklenir.

## n8n Ödeme Otomasyonu

Amaç: Müşteri ödeme yaptıktan sonra dekont akışını otomatikleştirmek.

1. Kullanıcı ödeme sayfasında:
- WhatsApp butonuna basar.
- Otomasyon siparişe uygun ödeme bilgisini (IBAN vb.) sohbetten iletir.
- Kullanıcı ödemeyi yapıp dekontu aynı sohbetten gönderir.

2. Uygulama, `N8N_PAYMENT_EVENT_WEBHOOK` tanımlıysa n8n’e `payment_chat_started` eventi gönderir.

3. n8n dekontu doğruladıktan sonra aşağıdaki endpoint’e callback yapar:
- `POST /api/integrations/n8n/payment-verification`
- Auth: `x-n8n-secret` header değeri `N8N_PAYMENT_VERIFY_SECRET` ile aynı olmalı.

Örnek callback payload:

```json
{
  "orderId": "65f0b8c2a8f1b2c3d4e5f678",
  "verified": true,
  "receiptUrl": "https://...",
  "transactionRef": "EFT-12345",
  "note": "Dekont ve tutar doğrulandı",
  "paidAmount": 4000,
  "verifiedAt": "2026-03-26T12:30:00.000Z"
}
```

`verified=true` ise sipariş otomatik `Ödeme Alındı` olur ve kullanıcı durumu güncellenir.

## Mongo -> PostgreSQL Veri Taşıma

Bu proje PostgreSQL + Prisma yapısına geçirildi. Eski Mongo verisini taşımak için:

1. Önce PostgreSQL migration'ı uygula:

```bash
npm run prisma:migrate:deploy
```

2. Sonra taşıma scriptini çalıştır:

```bash
MIGRATION_MONGODB_URI='mongodb+srv://...' \
MIGRATION_MONGODB_DB='oar-ore' \
npm run migrate:mongo-to-postgres
```

Opsiyonlar:
- `MIGRATION_TRUNCATE=1`: önce PostgreSQL tablolarını temizler.
- `MIGRATION_ONLY=users,products,orders,support_requests,settings`: sadece seçilen koleksiyonları taşır.

Script şu koleksiyonları taşır:
- `users`
- `products`
- `orders`
- `support_requests`
- `settings` -> `app_settings`

## Health Check

- Uygulama sağlık endpointi:
  - `GET /api/health`
- PostgreSQL sorgusu (`SELECT 1`) başarılıysa `200 { ok: true }`, değilse `503` döner.

## Canlıya Alma Checklist

1. `npm run check` komutunun lokal/CI’da geçtiğini doğrulayın.
2. Production env’leri tanımlayın:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `ADMIN_ALLOWED_EMAIL` veya `ADMIN_EMAIL`
   - `MAIL_FROM` + (`RESEND_API_KEY` veya `SMTP_*`)
   - n8n otomasyonu için:
     - `APP_BASE_URL`
     - `N8N_PAYMENT_EVENT_WEBHOOK`
     - `N8N_PAYMENT_EVENT_TOKEN` (opsiyonel)
     - `N8N_PAYMENT_VERIFY_SECRET`
3. Migration'ları canlıda uygulayın:
   - `npm run prisma:migrate:deploy`
4. Deploy sonrası kontrol edin:
   - `/api/health`
   - giriş/çıkış
   - checkout + sipariş oluşturma
   - admin sipariş güncelleme
   - destek talebi açma ve adminden yanıt maili gönderme
5. Domain/SSL ve mail sender domain doğrulamalarını (SPF/DKIM) tamamlayın.
