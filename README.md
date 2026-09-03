# BudgetCBO

Can Berk ve Tuğçe için Excel bütçe dosyasının (Ortak_Butce_v9.xlsx) yerini
alan, Firebase üzerinde ücretsiz katmanda çalışan web uygulaması.

**Canlı:** https://budgetcbo.web.app (Firebase Hosting, proje ID: `budgetcbo`)

- İş kuralları ve kapsam: `docs/proje-talimatlari.md`
- Faz faz geliştirme günlüğü: `docs/CHANGELOG.md`

## Mimari

Katmanlar tek yönlü:

```
Firestore  →  src/lib/*        ham okuma/yazma + normalleştirme
           →  src/data/        tek abonelik noktası (DataProvider)
           →  src/hooks/       sayfaların okuduğu arayüz
           →  src/pages/       gösterim
                src/domain/    saf iş kuralları (React ve Firebase'den bağımsız)
```

Kilit kurallar:

- **Türetilmiş hiçbir değer saklanmaz.** Kur çevirisi, bütçe tipi,
  paylaşım oranı, bakiyeler — hepsi okuma anında `src/domain/` içinde
  hesaplanır. Firestore yalnızca Excel'de elle doldurulan alanları tutar.
- **`src/domain/` saftır.** React, Firebase veya tarayıcı API'si import
  etmez; bu yüzden tamamı birim testiyle kaplanabiliyor.
- **Tarihler her yerde yereldir** (`src/domain/dates.ts`) ve `YYYY-MM-DD`
  biçiminde saklanır; sıralamalar metin karşılaştırmasına dayanır.
- **Tek abonelik.** Koleksiyonlar `src/data/DataProvider.tsx` içinde bir
  kez dinlenir; sayfalar aynı veriyi paylaşır.

## Komutlar

```bash
npm run dev           # gelistirme sunucusu
npm run build         # production build
npm run typecheck     # tip kontrolu
npm run lint          # ESLint
npm run format        # Prettier
npm test              # birim testleri (vitest)
npm run test:rules    # Firestore kural testleri (emulator + Java gerektirir)
npm run deploy        # build + tumunu yayinla (hosting + kurallar)
npm run deploy:rules  # yalnizca firestore.rules
npm run deploy:hosting # yalnizca uygulama (build + hosting)
```

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

Komutlar için yukarıdaki "Komutlar" bölümüne bakın.

Firebase yerine yerel emülatörlere bağlanmak için `.env` içinde
`VITE_USE_EMULATOR=true` yapıp `npx firebase emulators:start --only
firestore,auth` çalıştırın.

### 4. Firestore kurallarını emülatörde test etme

```bash
npm run test:rules
```

Bu komut Firestore emülatörünü başlatır, `tests/firestore.rules.test.ts`
içindeki testleri gerçek kurallara karşı çalıştırır ve emülatörü kapatır.
Java gerektirir. Kurallar kod tarafından değil, açıkça `firestore.rules`
içinde yazılır ve her değişiklikte doğrulanmalıdır (bkz. proje talimatları
bölüm 8).

### 5. Yayına alma (deploy)

```bash
npx firebase login          # tarayici acar, bir kez yeterli
npm run test:rules          # kurallari emulatorde dogrula
npm run deploy:rules        # once kurallar
npm run deploy:hosting      # sonra uygulama
```

`npm run deploy` ikisini tek adımda yapar. Sıra önemli değil ama kuralları
önce yayınlamak, yeni uygulamanın eski (gevşek) kurallarla çalıştığı bir
aralık bırakmaz.

**`.env` derleme anında okunur.** Vite `VITE_*` değişkenlerini paketin
içine gömer, yani `npm run build`'i çalıştırdığınız makinede gerçek
`.env` dosyası bulunmalıdır. `.env` git'e girmez.

#### Kural şeması ve eski kayıtlar

`firestore.rules` alan tiplerini doğrular. Bunun mevcut verilere etkisi
`tests/firestore.rules.test.ts` içinde ölçülmüştür:

| Eski, eksik alanlı bir kayıt | Sonuç                                                                     |
| ---------------------------- | ------------------------------------------------------------------------- |
| Okuma                        | Çalışır                                                                   |
| Silme                        | Çalışır                                                                   |
| Düzenleme                    | **Reddedilir** (eksik alanlar aynı düzenlemede doldurulursa kabul edilir) |

Uygulamanın kendi formlarının ve Excel içe aktarmasının ürettiği kayıtlar
yeni şemaya zaten uyar; eksik alanlı bir kayıt varsa listede "Eksik alan"
doğrulamasıyla zaten işaretli görünür.

## Teknik notlar

- Hesaplanan hiçbir değer Firestore'a yazılmaz (bkz. Mimari).
- Cloud Functions kullanılmıyor; ücretsiz katmanda kalmak esas. Gerçek
  push bildirimi bu yüzden yok — hatırlatmalar uygulama açıldığında
  istemci tarafında hesaplanır.
- Güncel kur önerisi (Ayarlar) ECB verisini CORS destekli Frankfurter
  servisinden çeker. Uygulama bu servise bağımlı değildir: erişilemezse
  kur elle girilir.
- PWA ikonları `public/icons/` altında yer tutucu olarak üretildi, isteğe
  bağlı olarak değiştirilebilir.
- Excel okuma/yazma için `exceljs` kullanılıyor (SheetJS `xlsx` paketinin
  npm'deki sürümü bilinen güvenlik açıkları taşıyor ve güncel/yamalı
  sürümüne bu ortamdan erişilemedi, bkz. commit geçmişi).
