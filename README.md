# Ortak Bütçe

Can Berk ve Tuğçe için Excel bütçe dosyasının (Ortak_Butce_v9.xlsx) yerini
alan, Firebase üzerinde ücretsiz katmanda çalışan web uygulaması. Kapsam ve
iş kuralları `docs/proje-talimatlari.md` dosyasındadır (bkz. yol haritası,
bölüm 9).

**Canlı:** https://budgetcbo.web.app (Firebase Hosting, proje ID: `budgetcbo`)

## Durum: Faz 8

**Faz 1-6** tamamlandı: iskelet/Auth/kurallar, ayarlar/harcama girişi,
gelirler/transferler/hesap bakiyeleri, ay panosu/kategori kırılımı, sabit
giderler/otomatik taslak üretimi, kişisel bütçeler/hedefler/katkı özeti.

**Faz 6** bu asamada eklendi — kişisel bütçeler, hedefler, katkı özeti:

- **Kişisel Bütçe** (`/kisisel-butce`): Butce_Can / Butce_Tugce
  sayfalarının karşılığı, kişi seçmeli tek sayfa. Gelir (kaynak bazında
  plan/gerçekleşen), ortak harcamalardaki pay, kişisel kategori
  harcamaları, tasarruf ve "Sonuç" özeti (net, atanmamış para durumu, bu
  ay harcanabilir kalan, günlük harcanabilir, tasarruf oranı). Plan
  hücreleri (sarı/elle girilen) `settings.personalPlans` içinde saklanır
  — Excel'de olduğu gibi aya göre değişmez, kullanıcı ay başında üzerine
  yazar. `src/domain/personalBudget.ts` içinde hesaplanır.
  **Not:** Excel'in kendi formülleri bölüm 2/3'te (Ortak payı/Kişisel
  harcama satırları) "Kalan" = plan−gerçekleşen, ama bölüm 5 SONUÇ
  tablosunda AYNI değerler için "Fark" = gerçekleşen−plan kullanır
  (işaret ters). Bu, Excel'in kendi iç tutarsızlığı; sadeleştirmeden
  birebir korundu, her iki alan da ayrı adlarla mevcut.
- **Hedefler** (`/hedefler`): hedef tutar/tarih, biriken (Transferler'den
  otomatik), kalan, ilerleme %, kalan ay, aylık gereken, Can/Tuğçe
  katkısı. `src/domain/goals.ts` içinde hesaplanır.
- **Katkı Özeti**: Hesap Bakiyeleri (`/hesaplar`) sayfasına eklendi
  (Excel'de de Hesaplar sayfasının bir bölümü). Kim doğrudan ödedi, kim
  Ortak Kasa'ya koydu, toplam katkı, kendi payı, fark — "borç" dili
  kullanılmadan, sadece "toplamda kim önde" bilgisi. `src/domain/
  contributions.ts` içinde hesaplanır.
- `src/domain/goals.test.ts`, `personalBudget.test.ts`,
  `contributions.test.ts`: Hedefler/Butce_Can/Butce_Tugce/Hesaplar
  sayfalarındaki gerçek rakamlarla (ör. Can net gerçekleşen 319,15 €,
  Tuğçe -103,94 €, katkı farkı Can +27,45 €/Tuğçe -27,45 €, kontrol
  toplamı 0) birebir karşılaştırma yapar. Toplam **115/115 test**
  geçiyor.
- Uçtan uca akış (hedef listesi, kişi değiştirme, plan girip
  kalıcılığını doğrulama, katkı özeti) Firebase emülatörlerinde
  tarayıcıda test edildi.

**Faz 7** bu asamada eklendi — Excel içe/dışa aktarma, offline çalışma, PWA:

- **İçe/Dışa Aktarma** (`/ice-disa-aktar`): `src/domain/excelImport.ts`
  Ortak_Butce_v9.xlsx'in gerçek kolon düzenini (veri 4. satırdan başlar)
  okuyup Islemler/Gelirler/Transferler/Sabit_Giderler/Hedefler
  sayfalarını Firestore'a aktarır; Ayarlar sayfası okunmaz (kategoriler/
  hesaplar zaten uygulamada tanımlı). `src/domain/excelExport.ts` aynı
  kolon düzeninde bir yedek üretir, yani **dışa aktarılan dosya tekrar
  içe aktarılabilir** (round-trip, test edildi). `exceljs` kütüphanesi
  (~1 MB) yalnızca bu sayfa ziyaret edildiğinde indirilir (dynamic
  import + PWA'nın önceden önbelleğe almasından hariç tutuldu), mobil
  ana paket şişmesin diye.
  **Bulunan ve düzeltilen hata:** Excel sayfalarında veri bloğundan
  sonra boş bir satırla ayrılmış TOPLAM/açıklama satırları var (ör.
  Hedefler!A12='TOPLAM'). İlk yaklaşım bunları da veri satırı sanıp
  yanlışlıkla içe aktarıyordu; parser artık ilk boş satırda kesin
  duruyor. Gerçek dosyayla (7 harcama, 2 gelir, 3 transfer, 16 sabit
  gider, 3 hedef) doğrulandı.
- **Offline çalışma**: Firestore `persistentLocalCache` ile etkinleştirildi
  (`src/firebase.ts`) — kayıtlar IndexedDB'de tutulur, internet yokken
  okuma/yazma çalışır, bağlantı gelince otomatik eşitlenir. Çevrimdışı
  olunduğunda küçük bir bildirim şeridi gösterilir (`OfflineBanner`).
- **PWA**: Faz 1'den beri kurulu olan service worker ve manifest
  doğrulandı; ana paket artık `exceljs` hariç ~800 KB önbelleğe alınıyor.

**Faz 8** bu asamada eklendi — hızlı giriş ekranı, hatırlatmalar, mükerrer
kayıt uyarısı. **Roadmap'teki tüm 8 faz tamamlandı.**

- **Hızlı Giriş** (`/hizli-giris`): proje talimatları bölüm 6.3'teki "max 5
  dokunuş" gereksinimine karşılık gelen tek ekran — tutar, kategori (son
  kullanılanlar üstte çip olarak, tam liste yedek `select` içinde), hesap
  (cihazda hatırlanan varsayılan), açıklama (opsiyonel), kaydet. Tarih
  otomatik bugün, para birimi sabit EUR. Ana sayfada büyük bir "+ Hızlı
  harcama girişi" düğmesiyle öne çıkarıldı. `src/lib/localPrefs.ts` son
  kategorileri ve varsayılan hesabı `localStorage`'da tutar — bilerek
  Firestore'a yazılmaz, çünkü bunlar **cihaza özel** kullanım kolaylığıdır
  (iki kullanıcı, iki telefon), Excel'de karşılığı yoktur.
- **Mükerrer kayıt uyarısı**: `src/domain/duplicates.ts`
  (`findDuplicateTransaction`) aynı gün+tutar+kategoride bir kayıt varsa
  tespit eder, **engellemez, sadece uyarır** (proje talimatları bölüm
  6.6). Hızlı Giriş'te ekran içi "Yine de kaydet / Vazgeç" olarak,
  Harcamalar (`/harcamalar`) sayfasında ise `window.confirm` olarak
  gösterilir. Excel'de karşılığı yoktur, uygulamanın eklediği bir
  otomasyondur.
- **Hatırlatmalar**: `src/domain/reminders.ts` (`computeReminders`) iki
  durumu hesaplar — (1) önümüzdeki 7 gün içinde ödemesi gelen aktif sabit
  giderler, (2) ay sonuna 5 gün veya daha az kalmışken o ay hâlâ
  "girildi" durumuna geçmemiş (onaylanmamış) sabit giderler. Ana sayfada
  `RemindersBanner` bileşeni bunları listeler, tıklanınca Sabit Giderler
  sayfasına yönlendirir. **Bilinçli olarak push bildirim değil, sadece
  uygulama içi uyarı** uygulandı: gerçek push bildirim, uygulama kapalıyken
  tetiklenmesi için bir Cloud Function/sunucu taraflı zamanlanmış tetikleyici
  gerektirir, bu hem projenin "istemci tarafında, uygulama açıldığında"
  mimarisiyle çelişir hem de ücretsiz katman sınırlarının ayrıca
  doğrulanmasını gerektirir (proje talimatları bölüm 6.2 ve bölüm 11.1).
  İleride istenirse ayrı bir araştırma konusu olarak ele alınabilir.
- `src/domain/duplicates.test.ts` (5 test), `reminders.test.ts` (5 test):
  toplam **131/131 test** geçiyor (13 test dosyası).
- Uçtan uca akış (hatırlatma şeridi, hızlı giriş kaydı, mükerrer uyarı
  hem Hızlı Giriş'te hem Harcamalar'da, son kategori çipinin sayfa
  yenilemede kalıcılığı) Firebase emülatörlerinde gerçek tarayıcıda test
  edildi.

Roadmap'teki tüm 8 faz (proje talimatları bölüm 9) artık tamamlandı:
iskelet/Auth/kurallar, ayarlar/harcama girişi, gelirler/transferler/hesap
bakiyeleri, ay panosu/kategori kırılımı, sabit giderler/otomatik taslak
üretimi, kişisel bütçeler/hedefler/katkı özeti, Excel içe/dışa aktarma ve
offline/PWA, hızlı giriş/hatırlatmalar. Kapsam dışı bırakılan ve bilinçli
olarak ertelenen konular (proje talimatları bölüm 6): banka ekstresi CSV
içe aktarma ("ikinci aşama işi" olarak tanımlanmıştı), fiş fotoğrafı
(Storage'ın ücretsiz katmanda uygunluğu doğrulanmadan eklenmedi), gerçek
push bildirimleri (yukarıda açıklandığı gibi).

**Görsel tasarım + açık/koyu tema** (roadmap dışı, ek istek üzerine):
Tüm renkler `src/styles.css` içinde CSS custom property olarak tanımlandı
(`:root` = açık tema, `[data-theme='dark']` = koyu tema); Tailwind
eklenmedi, projenin mevcut elle yazılmış CSS yaklaşımı korundu. Koyu
temada saf siyah değil antrasit tonlar (`#181715` arka plan, `#232120`
yüzey) kullanılıyor, parlak/neon renk yok. Vurgu rengi her iki temada da
sıcak amber/altın tonu — jenerik SaaS mavi/mor paletinden bilinçli olarak
uzaklaşıldı. Metin/arka plan kontrastları WCAG AA hedefiyle seçildi (ana
metin ve "muted" metin dahil tüm kombinasyonlar ≥4.5:1); yalnızca kart/
tablo kenarlıkları gibi salt gösterge amaçlı ayrımlar daha düşük kontrastta
(~1.8-2:1) bırakıldı, çünkü asıl öncelik veri metninin okunabilirliği.
Sağ üstte sabit bir `ThemeToggle` düğmesi (`src/components/ThemeToggle.tsx`)
tüm sayfalarda görünür; tema tercihi `localStorage`'da cihaza özel tutulur
(`src/lib/localPrefs.ts`, `butce.theme` anahtarı — Firestore'a yazılmaz,
diğer kişisel-cihaz tercihleriyle aynı mantık). `index.html` içindeki küçük
başlangıç script'i, React yüklenmeden önce doğru temayı `<html
data-theme>` olarak yazarak "yanlış temayla an içinde görünme" (FOUC)
sorununu önler; kullanıcı tercih belirlemediyse `prefers-color-scheme`
sistem ayarı kullanılır. `src/hooks/useTheme.ts` state mantığını taşır.
Güvenlik: hiçbir yerde `dangerouslySetInnerHTML` kullanılmadı (proje
genelinde zaten yoktu), tüm render React'in normal (kaçışlı) JSX
metodlarıyla yapılıyor; mevcut input tipleri/kısıtları değiştirilmedi,
yalnızca görsel (className/CSS) katman güncellendi.

## Kurulum

### 1. Firebase projesi

1. [Firebase Console](https://console.firebase.google.com)'da yeni proje
   oluşturun (Spark / ücretsiz katman).
2. Authentication > Sign-in method altında **E-posta/Şifre**'yi açın.
3. Authentication > Users altında Can Berk ve Tuğçe için birer kullanıcı
   elle oluşturun (e-posta + şifre). Uygulamada kayıt ekranı yok.
4. Her kullanıcının UID'sini kopyalayın (Users listesinde görünür).
5. Firestore Database'i **production mode**'da oluşturun (bölge: Avrupa,
   örn. `eur3`).
6. Project settings > General > "Your apps" altında bir Web app ekleyin,
   `firebaseConfig` değerlerini not edin.

### 2. Yerel ortam

```bash
npm install
cp .env.example .env
# .env dosyasini Firebase Console'dan aldiginiz degerlerle doldurun
```

`firestore.rules` dosyasındaki iki `REPLACE_WITH_..._UID` yerine adım 4'te
aldığınız gerçek UID'leri yazın.

`.firebaserc` dosyasındaki `REPLACE_WITH_FIREBASE_PROJECT_ID` yerine
Firebase proje ID'nizi yazın.

### 3. Geliştirme

```bash
npm run dev
npm run test        # is kurallari testleri (vitest)
npm run typecheck
```

Firebase yerine yerel emülatörlere bağlanmak için `.env` içinde
`VITE_USE_EMULATOR=true` yapıp `npx firebase emulators:start --only
firestore,auth` çalıştırın.

### 4. Firestore kurallarını emülatörde test etme

```bash
npx firebase emulators:start --only firestore
```

Kurallar kod tarafından değil, açıkça `firestore.rules` içinde yazılır ve
her değişiklikte emülatörle doğrulanmalıdır (bkz. proje talimatları bölüm 8).

### 5. Yayına alma (deploy)

```bash
npx firebase login
npx firebase deploy
```

Bu komut hem `firestore.rules`'u hem de `npm run build` çıktısını
(Firebase Hosting) yayınlar.

## Teknik notlar

- Hesaplanan hiçbir değer Firestore'a yazılmaz; sonraki fazlarda tüm
  türetilmiş alanlar (kur çevirisi, bütçe tipi, paylaşım oranı vb.) okuma
  anında istemci tarafında hesaplanacak.
- Cloud Functions kullanılmıyor; ücretsiz katmanda kalmak esas.
- PWA ikonları `public/icons/` altında yer tutucu olarak üretildi, isteğe
  bağlı olarak değiştirilebilir.
- Excel okuma/yazma için `exceljs` kullanılıyor (SheetJS `xlsx` paketinin
  npm'deki sürümü bilinen güvenlik açıkları taşıyor ve güncel/yamalı
  sürümüne bu ortamdan erişilemedi, bkz. commit geçmişi).
