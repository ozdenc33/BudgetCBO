# Ortak Bütçe

Can Berk ve Tuğçe için Excel bütçe dosyasının (Ortak_Butce_v9.xlsx) yerini
alan, Firebase üzerinde ücretsiz katmanda çalışan web uygulaması. Kapsam ve
iş kuralları `docs/proje-talimatlari.md` dosyasındadır (bkz. yol haritası,
bölüm 9).

## Durum: Faz 4

**Faz 1** (iskelet, Auth, Firestore kuralları), **Faz 2** (ayarlar, harcama
girişi, doğrulama) ve **Faz 3** (gelirler, transferler, hesap bakiyeleri)
tamamlandı.

**Faz 4** bu asamada eklendi — Ay Panosu (`/pano`), Ozet sayfasının
karşılığı:

- Ay Özeti: toplam gelir, toplam harcama, tasarrufa aktarılan, net,
  taşınma harici harcama, tasarruf oranı.
- Bütçe Tipi Bazında: her bütçe tipi için harcama, limit, kalan, kullanım
  %, önceki ay, pay %. Kategori limitleri Ayarlar > Kategoriler'e eklendi
  (`monthlyLimitEUR`, sadece Ortak-Ev/Ortak-Dışarı/Mike'ta anlamlı).
  **Not:** Excel'in Ortak_Butce sayfası limitleri aya göre değişmeyen tek
  bir sabit tablodur; talimatlar bölüm 4'teki `budgets` koleksiyonu
  aylık planlanmış olsa da, Excel'e birebir sadakat için limitler burada
  da aya göre değişmeyen tek bir değer olarak tutuluyor (kategori
  ayarının bir parçası, ayrı bir `budgets` koleksiyonu değil).
- Kategori Kırılımı: seçili ayda harcaması olan her kategori, harcama
  büyüklüğüne göre sıralı (en büyükler en üstte — Excel'deki "En Büyük 5
  Kategori" ve "Kategori Kırılımı" blokları tek tabloda birleştirildi).
- Kontroller: hatalı işlem/transfer satırı, kuru girilmemiş TL ayı, Ortak
  Kasa bakiye farkı. (Katkı kontrolü ve hedef farkı Faz 6'ya, sabit gider
  eksikliği Faz 5'e ertelendi çünkü kaynak veri henüz yok.)
- Aylık Gelişim: bütçe tipi bazında ve toplam, veri girilen her ay için
  (Excel'deki gibi 18 ay önceden sabit liste değil, veriden türetilir).
- `src/domain/dashboard.test.ts`: Ozet sayfasındaki gerçek Ekim 2026
  rakamlarıyla (Ortak-Ev 1012,40 €, toplam harcama 1196,79 €, net
  215,21 €, tasarruf oranı %20,85 dahil) birebir karşılaştırma yapar.
- Uçtan uca akış (panoyu gerçek veriyle görüntüleme, kategori limiti
  girip bütçe tipine yansıması) Firebase emülatörlerinde tarayıcıda test
  edildi.

Sonraki modüller (sabit giderler, kişisel bütçeler, hedefler, katkı
özeti) henüz yok; her biri kendi fazında, önceki fazın gerçek veriyle
test edilmesinden sonra eklenecek.

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
