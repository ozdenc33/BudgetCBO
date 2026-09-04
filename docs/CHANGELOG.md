# Değişiklik günlüğü

Faz faz geliştirme notları. Kurulum ve mimari için `README.md`'ye bakın.

## Faz 12: bölüşük hesap çekilişi, sabit gelirler, kur makası, mal varlığı

Kullanıcının tek seferde talep ettiği geniş bir özellik seti fazlar
halinde uygulandı: veri modeli (A), Firestore kuralları (B), formlar
(C), Ana Sayfa (D). Tüm yeni alanlar opsiyonel ve varsayılanları eski
davranışla birebir aynı — canlı veriler/hesaplar sessizce değişmedi.

- **Bölüşük hesap çekilişi.** `Transaction.secondAccount`: gerçek bir
  bölüşük ödemede (örn. %50 Can-DE, %50 Tuğçe-DE) her hesaptan kendi
  payı kadar çekilir — çekilen oran her zaman Can%/Tuğçe% ile birebir
  aynı. Harcamalar formunda oran 0/1 dışındaysa "farklı hesaplardan
  bölüşerek öde" seçeneği çıkar (varsayılan kapalı); biri "Ortak Kasa"
  seçilince diğeri otomatik "Ortak Kasa" olur. Hesap Bakiyeleri ve
  Katkı Özeti bölüşük kaydın her tarafını doğru hesaba/kişiye yazar.
- **Kişisel kategori uyarısı artık engellemiyor.** Can/Tuğçe %100
  değilse "Emin misin?" onayıyla yine de kaydedilebiliyor.
- **Sabit gelirler.** `RecurringItem.kind` ('expense'/'income'): aynı
  motor (taslak/atlama/onaylama/hatırlatma) artık Sperrkonto serbest
  bırakma, KYK kredisi gibi sabit GELİRLER için de çalışıyor;
  onaylanınca `incomes` koleksiyonuna yazılıyor. `paymentCount` ile
  toplam ödeme sayısı sınırlanabiliyor (örn. 12 ay); aşılınca
  "tamamlandı" durumuna geçiyor. Kalem TL cinsinden olabiliyor.
- **Kur makası.** `Settings.fxSpreadPct`: gerçek banka/döviz
  işlemlerindeki alış-satış farkını muhafazakâr yönde hesaba katıyor
  (gelirlerde kur biraz yüksekten, giderlerde biraz düşükten).
  Varsayılan 0 (makas yok). "Kur otomatik çek" düğmesi o günün ECB
  kurunu getirip kaydediyor (`fetchEurTryRateForDate`).
- **Hesapları birleştirme.** Ayarlar'da yeni bir araç: iki hesabı
  (örn. TR ve DE hesabı) tek hesapta toplar — tüm tarihsel kayıtları
  yeniden adlandırır, önizlemeli, geri alınamaz.
- **Ana Sayfa.** "Hesap Bakiyeleri" paneli öne çıkarıldı. "Mal
  Varlığı" kartı: kişinin kendi hesapları + Ortak Kasa'daki payı, göz
  ikonuyla blur'lanıp açılabiliyor (tercih cihazda kalıyor). Hesap
  Hareketleri'ndeki her satır artık tıklanabilir: ilgili sayfaya
  yönlendirip düzenleme formunu otomatik açıyor.

331 birim/bileşen testi + 34 Firestore kural testi geçiyor. Tüm akışlar
gerçek tarayıcıda Firebase emülatörleriyle uçtan uca test edildi.

## Faz 9-11: proje incelemesi sonrası iyileştirmeler

Kod incelemesinde çıkan bulgular üç fazda uygulandı.

### Faz 9 — kritik hatalar

- **UTC tarih kayması.** Tüm sayfalar `new Date().toISOString()`
  kullanıyordu; bu UTC tarihi verir. Almanya saatiyle gece 00:00–02:00
  arasında girilen bir harcama **bir önceki güne** yazılıyor, ayın 1'inde
  saat 01:00'de Ana Sayfa ve Ay Panosu **önceki ayı** gösteriyordu.
  `src/domain/dates.ts` tek doğru kaynak oldu.
- **Bayat "bugün".** `useMemo(() => new Date(), [])` PWA gün boyu açık
  kalınca eskiyordu. `useToday` gece yarısında ve uygulama öne
  geldiğinde tazeliyor.
- **Sessiz Firestore hataları.** Altı `onSnapshot` çağrısında hata geri
  çağrısı yoktu; kural reddinde ekran sonsuza kadar "Yükleniyor..."
  kalıyordu. Yazma çağrılarında da `catch` yoktu.
- **Çevrimdışı yazma kilidi.** `persistentLocalCache` açıkken
  `await addDoc` sunucu onayına kadar çözülmez; "Kaydet" düğmesi
  çevrimdışı sonsuza kadar kilitli kalıyordu (`src/lib/firestoreWrite.ts`).
- **Doğrulamasız veri.** `d.data() as Transaction` bir cast'ti;
  `src/lib/normalize.ts` artık gerçekten doğruluyor. Bozuk tutar 0
  yapılmaz, alan hiç yazılmaz ki mevcut "Eksik alan" doğrulaması satırı
  işaretlesin.
- **Eksik kur.** Kur girilmemişken sessizce 1 TRY = 1 EUR kabul
  ediliyordu (tutarlar ~35 kat şişiyordu); artık `rateWarning` ile
  uyarılıyor.
- Giriş hataları ayırt ediliyor (ağ hatası ≠ yanlış şifre).
- Uygulama adı **BudgetCBO** oldu.
- Tuğçe kendi hesabıyla girince renkli karşılama notu; Mike'ın
  bütçesine harcama girilince teşekkür notu (`src/domain/personalNotes.ts`).
- GitHub Actions CI eklendi.

### Faz 10 — mimari, performans, dayanıklılık

- **DataProvider.** Altı koleksiyon + ayarlar tek yerden dinleniyor.
  Önceden her sayfa ayrı abone oluyordu ve her rota geçişi koleksiyonun
  tamamını yeniden okuyordu.
- **ErrorBoundary.** Beyaz ekran yerine kurtarılabilir bir ekran; biri
  kökte, biri kabuğun içinde (bir sayfa çökse de gezinme ayakta kalıyor).
- **Hesaplama maliyeti.** `computeTransaction` içindeki kategori/hesap
  aramaları `Array.find`'dan `Map`'e alındı; hesaplanmış işlemler tek
  kez üretilip paylaşılıyor.
- **Kod bölme.** Rota bazlı `React.lazy` + Firebase/React için ayrı
  chunk: uygulama kodu 850 KB tek parçadan 53 KB'a (gzip 17 KB) indi.
- **Firestore kuralları.** Asgari şema doğrulaması eklendi ve
  `tests/firestore.rules.test.ts` ile gerçek emülatöre karşı test
  ediliyor (`npm run test:rules`).
- **İçe aktarmayı geri alma.** Her kayıt `importBatchId` taşıyor.
- ESLint + Prettier eklendi.

### Faz 11 — testler, dokümantasyon, ürün

- Bileşen testleri (`@testing-library/react`): bildirimler, karşılama
  notu, Hızlı Giriş akışı (mükerrer uyarısı, Mike notu, yazma hatası).
- Silmede `window.confirm` yerine 6 saniyelik **geri al**.
- **Güncel kur önerisi** (Ayarlar): ECB verisini CORS destekli
  Frankfurter üzerinden getirir, kaydetmez — yalnızca formu doldurur.
- **Ay Kapanışı** bölümü: seçili ay bir öncekiyle karşılaştırılır, en
  çok artan/azalan kategoriler listelenir.
- Sabit giderlerde **tümünü onayla** (tutarı girilmemiş kalemler hariç).
- README ikiye ayrıldı, `styles.css` parçalara bölündü.

Tarayıcıda (Firebase emülatörleriyle) uçtan uca doğrulandı: Tuğçe'nin
karşılama notu (5 sn sonra kayboluyor, çarpıyla da kapanıyor), Mike
harcamasında teşekkür notu ve Mike dışı harcamada çıkmaması, silme +
geri alma, ay kapanışı karşılaştırması, çevrimdışı kayıt (form 62 ms'de
serbest kalıyor, bağlantı gelince eşitleniyor).

---

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

**Arayüz ve tema** (roadmap dışı, ek istek üzerine):

- **TUM renk paleti.** Tüm renkler `src/styles.css` içinde CSS custom
  property olarak tanımlı (`:root` = açık tema, `[data-theme='dark']` =
  koyu tema); Tailwind eklenmedi, projenin elle yazılmış CSS yaklaşımı
  korundu. Ana renk TUM Mavi `#0065BD` (koyu temada okunabilirlik için
  TUM Açık Mavi `#64A0C8`), vurgular TUM Turuncu `#E37222` ve TUM Yeşil
  `#A2AD00` ailesinden. Koyu temada saf siyah değil soğuk antrasit
  (`#15181c` zemin, `#1e2228` yüzey), neon/parlama yok. Metin-zemin
  kontrastları WCAG AA hedefiyle hesaplanarak seçildi (tüm metin
  kombinasyonları ≥4.5:1, çoğu 6-15:1); yalnızca kart/tablo kenarlıkları
  gibi salt gösterge amaçlı çizgiler daha düşük kontrastta (~2:1)
  bırakıldı, çünkü öncelik veri metninin okunabilirliği.
- **Kalıcı gezinme.** Eskiden her modüle ana sayfadan gidiliyor, her
  sayfada yalnızca "← Ana sayfa" bağlantısı bulunuyordu. Artık tüm
  sayfalar ortak bir kabuğa (`src/components/AppShell.tsx`) sarılı: üstte
  başlık çubuğu + tema düğmesi, altta 5 yuvalı sekme çubuğu (Özet, Pano,
  ortada Hızlı giriş, Harcama, Menü) ve menüden açılan, işleve göre
  gruplanmış (Kayıt / Plan / Rapor / Sistem) tam modül listesi.
- **Ana sayfa artık gerçek bir özet.** Aynı tipte kart ızgarası yerine:
  bu ayın harcama/gelir/net/tasarruf özeti (mevcut `computeMonthSummary`
  ile), son 5 kayıt, hatırlatmalar ve kısayollar.
- **Açılır form.** Harcama/gelir/transfer/hedef/sabit gider sayfalarında
  uzun form artık varsayılan olarak kapalı (`<details>`); liste hemen
  görünüyor, "Düzenle"ye basılınca form otomatik açılıp doluyor.
- **Okunabilirlik.** Tablolarda zebra satır, yapışkan başlık ve ilk
  kolon, `tabular-nums` ile hizalı rakamlar; liste satırlarında tutar
  vurgusu ve etiket rozetleri.
- **Hesaplama katmanına dokunulmadı.** `src/domain/` altındaki hiçbir
  dosya değişmedi (git ile doğrulandı); sayfalarda yalnızca eski başlık
  bloğu kaldırıldı ve form `<details>` içine alındı. 131/131 test geçiyor,
  ayrıca tarayıcıda 12 sayfa iki temada tek tek kontrol edildi (konsol
  hatası yok, yatay taşma yok, hesaplama önizlemesi ve kayıt akışı
  çalışıyor).
- **Güvenlik.** Hiçbir yerde `dangerouslySetInnerHTML` kullanılmadı (proje
  genelinde zaten yoktu), tüm render React'in normal (kaçışlı) JSX
  metodlarıyla yapılıyor; mevcut input tipleri/kısıtları değiştirilmedi,
  yalnızca görsel (className/CSS) katman güncellendi.

**Sonraki tur düzeltmeler ve eklemeler:**

- **İki hata düzeltildi.** Ayarlar'daki hesap/kategori kutuları ve Kişisel
  Bütçe'deki plan kutuları `defaultValue` (kontrolsüz input) kullanıyordu;
  React bunları yalnızca ilk render'da doldurduğu için (a) kişi değiştirince
  eski kişinin değerleri ekranda kalıyor, (b) Firestore'dan veri geç geldiği
  için sayfa yenilendiğinde kaydedilmiş değer yerine 0 görünüyordu. Inputlara
  değere/kişiye bağlı `key` verilerek ikisi de düzeltildi.
- **İsimsiz kutulara etiket.** Ayarlar'da hesabın yanındaki kutu "Başlangıç
  bakiyesi €", kategorinin yanındaki "Aylık limit €" olarak etiketlendi
  (önceden yalnızca görünmez `aria-label` vardı).
- **Grafikler.** Ay Panosu'na kategori kırılımı (yatay çubuk, tek seri) ve
  aylık gelişim (gruplu sütun: harcama/gelir) grafikleri eklendi;
  `src/components/charts.tsx`, harici kütüphane yok, inline SVG + CSS.
  Seri renkleri dataviz doğrulayıcısından geçirildi (aydınlık bandı, kroma
  tabanı, renk körlüğü ayrımı, zemin kontrastı: açık ve koyu temada tümü
  PASS). Her grafiğin altında aynı verinin tablosu duruyor.
- **PDF / yazdırma.** Ay Panosu'nda "PDF / Yazdır" düğmesi; yazdırma CSS'i
  gezinmeyi gizler, her zaman açık tema renklerini kullanır ve bölümleri
  sayfa sonunda bölmez.
- **Masaüstü düzeni.** 1024px üstünde alt sekme çubuğu yerine kalıcı kenar
  çubuğu, 1180px içerik genişliği; listeler ve ayar bölümleri çok kolona
  akar (site artık "uzun ince" değil).
- **Hızlı girişte tarih.** Varsayılan bugün, istenirse geçmiş tarih seçilir
  ("Bugüne dön" kısayoluyla).
- **Kişi uyarısı.** Can hesabıyla Tuğçe'nin (veya tersi) bütçe planı
  değiştirilirken uyarı şeridi + tek seferlik onay (`src/lib/currentPerson.ts`).
- Arayüzdeki "Faz 2 / Faz 3..." etiketleri ve gereksiz uzun notlar temizlendi.

**Filtreler, kişi özeti ve gerçek kullanım simülasyonu:**

- **Başlangıç bakiyesi kaldırıldı (Excel'den bilinçli sapma).** Excel'de
  Hesaplar formülü `Bakiye = Başlangıç + Gelirler − Harcamalar − Transfer
Çıkış + Transfer Giriş` şeklindeydi. `Başlangıç` sütunu tamamen
  kaldırıldı; açılış bakiyesi artık uygulamayı kullanmaya başlamadan
  önceki bir tarihle **normal gelir kaydı** olarak girilir. Bakiye sonucu
  aynı kalır. **Değişen tek şey:** o kayıt, girildiği ayın gelir
  raporlarında da görünür (bu yüzden kullanıma başlamadan önceki bir aya
  tarihlemek gerekir). Ay Panosu'ndaki "Ortak Kasa bakiye farkı" kontrolü
  de buna göre güncellendi (artık hesabın kendi gelirlerini de sayar).
- **Filtreler** (`src/domain/filters.ts` + `TransactionFilters`):
  serbest metin araması (açıklama, kategori, hesap, etiket, not — Türkçe
  İ/ı duyarlı), ay, kategori, hesap, bütçe tipi ve tutar aralığı. Başlıkta
  "N kayıt · X €" özeti. Kayıt sayısı büyüdükçe liste kullanılabilir kalsın
  diye eklendi.
- **Ortak / Can / Tuğçe özeti** (`src/domain/personSummary.ts`): ana
  sayfada kapsam seçici. Kişi kapsamında harcama = o kişinin payı
  (Islemler'deki "Can Payı"/"Tuğçe Payı" kolonlarının toplamı), gelir =
  o kişiye ait gelirler. Yeni iş kuralı yok; test: iki kişinin payı
  toplamı ortak toplama eşit.
- **Haftalık özet**: bu hafta (Pazartesi–bugün) harcaması ve geçen haftayla
  farkı.
- **Limit uyarıları** (`src/domain/budgetAlerts.ts`): bütçe tipi limitinin
  %80'ine gelince "yaklaşıldı", aşılınca "aşıldı". Ayrıca **eksiye düşen
  hesap uyarısı** (özellikle Ortak Kasa).
- **Tekrarla düğmesi**: bir kaydı bugüne kopyalar (form açılır, tutar
  değiştirilebilir).
- **Net trend grafiği**: aylık gelir−harcama çizgisi, sıfır çizgisi vurgulu.
- **Hızlı girişte tarih**, kısayollarda Hesaplar.

**Gerçek kullanım simülasyonu** (2 aylık, 82 harcama + gelir/transfer/sabit
gider/hedef ile emülatörde uçtan uca): sayılar tutarlı çıktı — bütçe tipi
toplamı = kategori kırılımı toplamı = Ay Özeti toplam harcaması (1.479,54 €),
Can payı + Tuğçe payı = ortak toplam, katkı özeti kontrolü 0,00 €. Hızlı
giriş 3 dokunuş. Simülasyonun ortaya çıkardığı ve düzeltilen iki sorun:
(1) limit uyarıları yalnızca "Ortak" kapsamında görünüyordu, yani kendi
hesabıyla giren kişi ev limitlerini hiç görmüyordu — artık her kapsamda
görünüyor; (2) ana sayfada uyarı/hatırlatma şeritleri özet kartının önüne
yığılıyordu — özet kartı en üste alındı, hatırlatmalar 2 ve limit uyarıları
3 ile sınırlandı, kalanı "+N daha" satırında toplanıyor.

**Transfer düzeltmesi, ileri tarihli kayıtlar ve arayüz rötuşları:**

- **Tasarruf transferi hatası düzeltildi.** "Alıcı" serbest metin kutusuydu
  ve yalnızca Ortak Kasa / Can / Tuğçe öneriyordu; oysa Tasarruf tipinde
  alıcı bir **birikim hedefi** olmak zorunda (`transfers.ts`:
  "Alıcı bir hedef olmalı"). Listeden ne seçilse hata veriyordu. Artık
  alıcı alanı tipe göre değişen bir `select`: Ortak Kasa Katkısı → Ortak
  Kasa, Kişiden Kişiye → diğer kişi, Tasarruf → hedef listesi. Hiç hedef
  yoksa alan kilitlenir ve Hedefler sayfasına yönlendiren açık bir uyarı
  çıkar.
- **Hesap alanları artık zorunlu.** "Kaynak Hesap" ve "Hedef Hesap"
  "opsiyonel" işaretliydi; oysa parayı hesaplar arasında asıl taşıyan
  bunlar. Boş bırakılınca transfer kaydediliyor ama hiçbir bakiye
  değişmiyordu (sessiz veri kaybı). Etiketleri de netleştirildi:
  "Kaynak Hesap (para buradan çıkar)" / "Hedef Hesap (para buraya girer)".
- **İleri tarihli kayıtlar** (`src/domain/futureDated.ts`): tarihi bugünden
  sonra olan kayıtlar listede "ileri tarihli" rozetiyle işaretlenir, Ay
  Panosu'nda "bu toplamın X €'su henüz hesaptan çıkmadı" notu görünür.
  **Toplamların anlamı değiştirilmedi** — Excel'de de SUMIFS tarihe
  bakmadan toplar; yapılan tek şey bunu görünür kılmak.
- Ayarlar ikonu gerçek dişliyle değiştirildi (eskisi tema düğmesindeki
  güneş ikonuyla neredeyse aynıydı).
- Ana sayfa metni: "Bu ay Can payı" yerine "Can bu ay ne harcadı",
  başlıkta "Eylül 2026 · Can'in payı".

**Hesap hareketleri, tasarruf kırılımı, gecikmiş sabit gider uyarısı:**

- **Hesap hareketleri** (`/hesaplar/:accountId`): Hesap Bakiyeleri'nde bir
  hesaba tıklayınca o hesabın ekstresi açılır — tüm harcama, gelir ve
  transfer hareketleri, yürütülen bakiyeyle birlikte, ay filtresiyle.
  `src/domain/accountLedger.ts`; yeni iş kuralı yok, Hesap Bakiyeleri'ndeki
  toplamların hangi kayıtlardan oluştuğunu satır satır gösterir (test:
  son yürütülen bakiye = Hesap Bakiyeleri'ndeki bakiye).
- **Tasarruf hesabında "bu para ne için?" kırılımı**: hesaba gelen Tasarruf
  transferleri hedefe ve **parayı gönderen kişiye** göre kırılır (ör.
  Can-Tasarruf 950 € = Acil Durum Fonu 650 € [Can 400 + Tuğçe 250] +
  Kamera Lens 300 € [Can 300]). Hedefe atanmamış bakiye ayrıca gösterilir.
  **Not:** her hedef için ayrı hesap açmak yerine bu yol seçildi — hesap
  sayısı şişmez, bakiyeler tek yerde kalır, ama "hangi para ne için ve kim
  koydu" sorusu yine cevaplanır.
- **Gecikmiş sabit gider uyarısı**: önceden yalnızca ay sonuna 5 gün kala
  uyarılıyordu; artık ödeme günü geçmiş ama o ay hâlâ girilmemiş kalemler
  ay sonunu beklemeden ana sayfada kırmızı şeritle görünür
  (`reminders.ts` → `overdue`).
- **Başkasının hesabına transferde onay**: Can, Tuğçe'nin hesabına (veya
  tersi) para aktarırken "bu hesap X adına, devam edilsin mi?" onayı
  çıkar. Ortak Kasa'ya aktarımda çıkmaz.

Tema tercihi `localStorage`'da cihaza özel tutulur (`src/lib/localPrefs.ts`,
`butce.theme` anahtarı — Firestore'a yazılmaz). `index.html` içindeki küçük
başlangıç script'i, React yüklenmeden önce doğru temayı `<html data-theme>`
olarak yazarak FOUC'u önler; kullanıcı tercih belirlemediyse
`prefers-color-scheme` sistem ayarı kullanılır (`src/hooks/useTheme.ts`).
