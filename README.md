# Ortak Bütçe

Can Berk ve Tuğçe için Excel bütçe dosyasının (Ortak_Butce_v9.xlsx) yerini
alan, Firebase üzerinde ücretsiz katmanda çalışan web uygulaması. Kapsam ve
iş kuralları `docs/proje-talimatlari.md` dosyasındadır (bkz. yol haritası,
bölüm 9).

## Durum: Faz 2

**Faz 1** (proje iskeleti, Firebase Auth, Firestore kuralları) tamamlandı.

**Faz 2** bu asamada eklendi:

- `settings/app` Firestore dokümanı: hesaplar, kategoriler, gelir
  kaynakları, aylık EUR/TRY kur tablosu + varsayılan kur, Sperrkonto
  (toplam + aylık serbest tutar). Doküman yoksa Ayarlar sayfasındaki
  Excel verileriyle (8 hesap, 42 kategori, 8 gelir kaynağı) bir kerelik
  tohumlanır; `/ayarlar` ekranından eklenip çıkarılabilir.
- Harcama girişi (`/harcamalar`): Islemler sayfasındaki A-H alanları
  (tarih, açıklama, kategori, tutar, hesap, para birimi, Can %/Tuğçe %,
  etiket, not). Gri (formül) kolonların birebir karşılığı —kur çevirisi,
  bütçe tipi, ödeyen, paylaşım oranı, Can/Tuğçe payı, doğrulama— istemci
  tarafında `src/domain/transactions.ts` içinde hesaplanır, Firestore'a
  yazılmaz.
- Doğrulama kuralları (talimatlar bölüm 5) canlı önizlemede uygulanır;
  hata varsa kayıt engellenir. `src/domain/transactions.test.ts`,
  Islemler sayfasındaki 6 gerçek satırla ve tüm doğrulama kurallarıyla
  test eder (`npm run test`).
- Uçtan uca akış (giriş, ayarlar tohumlama, harcama ekle/düzenle/sil)
  Firebase emülatörlerinde tarayıcıda test edildi.

Sonraki modüller (gelirler, transferler, hesap bakiyeleri, ay panosu,
sabit giderler, kişisel bütçeler, hedefler, katkı özeti) henüz yok; her
biri kendi fazında, önceki fazın gerçek veriyle test edilmesinden sonra
eklenecek.

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
