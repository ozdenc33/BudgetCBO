# Ortak Bütçe

Can Berk ve Tuğçe için Excel bütçe dosyasının (Ortak_Butce_v9.xlsx) yerini
alan, Firebase üzerinde ücretsiz katmanda çalışan web uygulaması. Kapsam ve
iş kuralları `docs/proje-talimatlari.md` dosyasındadır (bkz. yol haritası,
bölüm 9).

## Durum: Faz 5

**Faz 1** (iskelet, Auth, Firestore kuralları), **Faz 2** (ayarlar, harcama
girişi, doğrulama), **Faz 3** (gelirler, transferler, hesap bakiyeleri) ve
**Faz 4** (ay panosu, kategori kırılımı) tamamlandı.

**Faz 5** bu asamada eklendi — Sabit Giderler (`/sabit-giderler`),
Sabit_Giderler sayfasının karşılığı:

- Sabit gider listesi: kalem, bütçe tipi, kategori, plan tutarı
  (opsiyonel), sıklık (1/3/6/12 ay), hesap, ilk ödeme tarihi, aktif.
  Aylık eşdeğer, sonraki ödeme tarihi (bugüne göre), kalan gün ve seçili
  ay durumu (Girildi/EKSIK/—) `src/domain/recurring.ts` içinde
  hesaplanır — Sabit_Giderler!I,J,K,M formüllerinin birebir karşılığı.
  "Bu ay girildi mi" kontrolü Excel'deki gibi kalem bazında değil,
  Bütçe+Kategori ikilisi bazında eşleşir (aynı ikiliyi paylaşan iki
  kalem birlikte "Girildi" sayılır, bkz. Kilavuz!B24).
- **Otomatik taslak üretimi** (Excel'in yapamadığı, elle kopyala-yapıştır
  yerine): o ay vadesi gelmiş ve girilmemiş her kalem için bir taslak
  işlem kartı gösterilir (tutar düzenlenebilir). Kullanıcı **Onayla**
  derse gerçek bir harcama olarak `transactions`'a yazılır; **Atla**
  derse `recurringSkips` koleksiyonunda o kalem+ay için işaretlenir ve
  bir daha taslak olarak çıkmaz (idempotent — sayfa her açıldığında
  aynı kalem tekrar üretilmez, onaylanmadan hiçbir kayıt gerçekleşen
  sayılmaz).
- `src/domain/recurring.test.ts` (14 test): Sabit_Giderler sayfasındaki
  16 gerçek kalemle ve gerçek "bugün" tarihiyle (2026-09-02, bu depoyu
  hazırladığımız gün) birebir karşılaştırma yapar — sonraki ödeme
  tarihleri, kalan gün sayıları ve seçili ay durumları dahil.
- Uçtan uca akış (16 kalemi yükleyip taslak listesini görüntüleme, tutar
  girip onaylama, atlama ve geri alma) Firebase emülatörlerinde
  tarayıcıda test edildi.

Sonraki modüller (kişisel bütçeler, hedefler, katkı özeti) henüz yok;
her biri kendi fazında, önceki fazın gerçek veriyle test edilmesinden
sonra eklenecek.

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
