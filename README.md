# Ortak Bütçe

Can Berk ve Tuğçe için Excel bütçe dosyasının (Ortak_Butce_v9.xlsx) yerini
alan, Firebase üzerinde ücretsiz katmanda çalışan web uygulaması. Kapsam ve
iş kuralları `docs/proje-talimatlari.md` dosyasındadır (bkz. yol haritası,
bölüm 9).

## Durum: Faz 7

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

Sonraki adım Faz 8 (hızlı giriş ekranı, hatırlatmalar); roadmap'teki tüm
ana modüller artık tamamlandı.

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
