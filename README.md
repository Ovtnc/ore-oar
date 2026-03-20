# Oar & Ore

Atölye üretim takı e-ticaret uygulaması.

## Özellikler

- Ürün listeleme ve ürün detay sayfaları
- Çoklu ürün görseli, kaplama opsiyonu ve fiyat farkı
- Sepet, checkout, ödeme bildirimi akışı
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
- MongoDB
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

3. Gerekli env değerlerini doldurun (`MONGODB_URI`, `AUTH_SECRET`, `ADMIN_EMAIL`, mail ayarları).

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

## Admin Erişimi

- Admin erişimi e-posta bazlıdır.
- Oturum açmış kullanıcının e-postası `ADMIN_ALLOWED_EMAIL` (veya fallback `ADMIN_EMAIL`) ile eşleşiyorsa `/admin` ve `/api/admin` erişimi açılır.

## Mail Altyapısı

- `RESEND_API_KEY` varsa Resend kullanılır.
- Yoksa `SMTP_*` ayarları ile SMTP kullanılır.
- Sipariş, durum güncelleme, ödeme hatırlatma, destek talebi ve destek yanıtı mailleri desteklenir.

## Health Check

- Uygulama sağlık endpointi:
  - `GET /api/health`
- MongoDB `ping` başarılıysa `200 { ok: true }`, değilse `503` döner.

## Canlıya Alma Checklist

1. `npm run check` komutunun lokal/CI’da geçtiğini doğrulayın.
2. Production env’leri tanımlayın:
   - `MONGODB_URI`, `MONGODB_DB`
   - `AUTH_SECRET`
   - `ADMIN_ALLOWED_EMAIL` veya `ADMIN_EMAIL`
   - `MAIL_FROM` + (`RESEND_API_KEY` veya `SMTP_*`)
3. MongoDB kullanıcısında write izinlerini doğrulayın (`orders`, `products`, `settings`, `support_requests`, `users`).
4. Deploy sonrası kontrol edin:
   - `/api/health`
   - giriş/çıkış
   - checkout + sipariş oluşturma
   - admin sipariş güncelleme
   - destek talebi açma ve adminden yanıt maili gönderme
5. Domain/SSL ve mail sender domain doğrulamalarını (SPF/DKIM) tamamlayın.
