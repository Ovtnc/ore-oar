# Frontend UX Geliştirme Önerileri

Bu doküman, mevcut Oar & Ore arayüzüne göre kullanıcı deneyimini artıracak somut geliştirme önerilerini önceliklendirilmiş şekilde listeler.

## Mevcut Durum Özeti

- Proje lokalde çalışıyor: `http://localhost:3002`
- Sağlık kontrolü başarılı: `GET /api/health -> ok: true`
- Tasarım dili güçlü (premium, koyu tema, altın vurgu)
- Temel akışlar mevcut:
  - Ana sayfa
  - Ürün listeleme / detay
  - Sepet / checkout
  - Siparişlerim
  - Destek talebi

## Ana Hedefler

1. Ürün keşfini hızlandırmak
2. Satın alma güvenini artırmak
3. Checkout sürtünmesini azaltmak
4. Sipariş sonrası memnuniyeti yükseltmek

## KPI Önerileri (ölçüm)

- Ürün kartı tıklama oranı (CTR)
- Ürün detaydan sepete ekleme oranı
- Sepetten checkout'a geçiş oranı
- Checkout tamamlama oranı
- Destek talebi açılma oranı (sipariş başına)
- Ortalama sipariş tutarı (AOV)

## 1) Hızlı Kazanımlar (1-2 hafta)

### 1.1 Ana sayfa hero net değer önerisi
- Hero CTA'larını tek ana hedefe indir:
  - Birincil: `Koleksiyonu Keşfet`
  - İkincil: `Nasıl Çalışıyoruz`
- Hero altına 3 güven maddesi ekle:
  - `El işçiliği kalite kontrol`
  - `Sipariş sonrası canlı durum takibi`
  - `Kaplama fiyatı şeffaf`

### 1.2 Ürün kartında karar hızlandırma
- Kart üzerinde sabit bilgi satırı:
  - `Başlangıç fiyatı`
  - `Tahmini hazırlık süresi`
  - `Kaplama mevcut / yok`
- Hover'da ikinci görsel önizleme (varsa `images[1]`)

### 1.3 Ürün detayda güven kutusu
- `Neden bu ürün?` kutusu ekle:
  - Malzeme
  - İşçilik
  - Teslimat süresi
  - İade/iptal kısa notu

### 1.4 Sepette kargo barı
- Kalan ücretsiz kargo tutarını progress bar ile göster:
  - `Ücretsiz kargo için X TL kaldı`

### 1.5 Checkout mikro-iyileştirmeleri
- Input mask:
  - Telefon formatı
  - Posta kodu
- Satır içi doğrulama (submit sonrası değil, anlık)
- Form üstünde `yaklaşık tamamlanma` göstergesi

## 2) Orta Vadeli (2-4 hafta)

### 2.1 Ürün listeleme filtre/sıralama
- Filtreler:
  - Kategori
  - Fiyat aralığı
  - Stokta olanlar
  - Kaplama opsiyonu olanlar
- Sıralama:
  - Önerilen
  - Fiyat artan/azalan
  - Yeni eklenen

### 2.2 Arama deneyimi
- Header'a global arama ekle
- Anlık sonuç dropdown:
  - ürün adı
  - kategori
  - fiyat

### 2.3 Ürün detay medya deneyimi
- Galeriye:
  - zoom
  - swipe (mobil)
  - klavye navigasyonu
- `3D/Lookbook` entegrasyonunu detayda alt sekme olarak sun

### 2.4 Kişiselleştirme netliği
- Kaplama seçimi değiştiğinde:
  - fiyat farkı animasyonla güncellensin
  - stok uygunluğu (kaplama bazlısa) anlık görünür olsun

## 3) Satın Alma ve Güven Artırıcılar

### 3.1 Sosyal kanıt
- Ürün detayda mini yorum/puan bileşeni
- `X kişi favorilerine ekledi` gibi yumuşak sosyal sinyal

### 3.2 SSS blokları
- Ürün detay altına 5 kısa soru:
  - teslimat
  - bakım
  - kaplama farkı
  - garanti
  - üretim süreci

### 3.3 Sipariş sonrası deneyim
- `Siparişlerim` sayfasına timeline kartları:
  - durum adı
  - tarih
  - beklenen sonraki adım
- Her durumda `Sık sorular` kısa yardım linki

## 4) Teknik UX İyileştirmeleri

### 4.1 Performans
- Görsellerde:
  - boyut varyantları
  - lazy loading stratejisi
  - kritik görsel preload
- Ana sayfada LCP görselini optimize et

### 4.2 Erişilebilirlik (a11y)
- Kontrast denetimi (altın tonlarda)
- Klavye odak halkaları tüm buton/linklerde tutarlı
- Form hatalarında `aria-live` geri bildirimi

### 4.3 Boş/hata durumları
- Sepet boş, ürün yok, destek yok gibi ekranları daha yönlendirici yap
- API hatalarında kullanıcı dostu eylem metni:
  - `Tekrar dene`
  - `Ürünlere dön`

## 5) Önerilen Öncelik Backlog

## P0 (hemen)
- Hero mesaj + CTA sadeleştirme
- Ürün kartı bilgi satırı + ikinci görsel hover
- Checkout input mask + anlık validasyon
- Sepet ücretsiz kargo progress bar

## P1 (sonraki sprint)
- Ürün filtre/sıralama
- Global arama
- Ürün detay güven kutusu + SSS

## P2 (ölçekleme)
- Yorum/puan sistemi
- Sipariş timeline'ına tahmini tarih/yardım
- A/B test altyapısı (CTA ve kart yerleşimi)

## 6) Uygulama Planı (öneri)

### Sprint 1
- P0 maddeleri
- KPI event isimleri belirleme (`view_product`, `add_to_cart`, `start_checkout`, `place_order`)

### Sprint 2
- Filtre/arama
- Ürün detay güven ve SSS

### Sprint 3
- Sosyal kanıt
- Sipariş sonrası timeline zenginleştirme

## 7) Başarı Kriteri

- Checkout dönüşümünde artış
- Sepet terk oranında azalma
- Destek talebi başına tekrar mesaj sayısında azalma
- Kullanıcıların ürün bulma süresinde kısalma

