# PROJE TALİMATLARI: ORTAK BÜTÇE WEB UYGULAMASI

## 1. Projenin Amacı

Can Berk Özden ve Tuğçe'nin ortak kullandığı Excel bütçe dosyasını (Ortak_Butce_v9.xlsx) iki kişilik, web tabanlı, Firebase üzerinde ücretsiz katmanda çalışan bir uygulamaya çevirmek.

Excel dosyası veri modelinin ve iş kurallarının referansıdır. Uygulama Excel'in yaptığı her şeyi yapmalı, ek olarak Excel'in yapamadığı otomasyonları getirmelidir. Excel'de olmayan bir kavram uygulamaya kendiliğinden girmez; yeni kavram önerilecekse gerekçesiyle önerilir.

**Öncelik sırası:** doğruluk > telefondan hızlı giriş > otomasyon > görsel cila.

---

## 2. Kullanıcılar ve Bağlam

- İki kullanıcı: Can Berk (Almanya'ya Eylül 2026'da taşınıyor, TUM Heilbronn) ve Tuğçe (Stuttgart'ta yerleşik).
- Kullanım dili Türkçe. Almanca resmi terimler korunur (Kaution, Nebenkosten, Sperrkonto, Rundfunkbeitrag).
- Para birimi EUR, ikincil TRY. Geçiş dönemi boyunca TL harcama olacak.
- Ana kullanım telefondan olacak. Masaüstü ikinci sırada ama rapor okumak için gerekli.
- Kullanıcı SolidWorks, ANSYS, MATLAB, Python, Proxmox ve Home Assistant kullanıyor. Teknik konularda basitleştirme yapılmaz.

---

## 3. Teknik Çerçeve

- **Barındırma:** Firebase Hosting
- **Veritabanı:** Cloud Firestore
- **Kimlik:** Firebase Authentication, iki sabit kullanıcı
- **İstemci:** React (Vite), PWA olarak kurulabilir, offline çalışabilir
- **Zorunlu kısıt:** Ücretsiz katmanda kalmak. Cloud Functions gerektiren her çözüm önce sorgulanır; ücretsiz katman kapsamı ve limitler her seferinde Firebase'in güncel fiyatlandırma sayfasından teyit edilir, hafızadan rakam verilmez.
- **Sonuç olarak:** yinelenen kayıt üretimi, kur güncelleme ve hesaplamalar mümkün olduğunca istemci tarafında, uygulama açıldığında çalışır. Sunucu tarafı iş yalnızca başka yolu kalmadığında önerilir ve maliyeti açıkça yazılır.
- Hesaplanan hiçbir değer veritabanında saklanmaz. Firestore yalnızca kullanıcının girdiği ham veriyi tutar; tüm türetilmiş alanlar okuma anında hesaplanır. Excel'deki gri kolonların hiçbiri veri değildir.

---

## 4. Veri Modeli

Firestore koleksiyonları. Alan adları İngilizce, arayüz Türkçe.

### transactions (harcamalar)

Kullanıcının girdiği alanlar: `date`, `description`, `category`, `amount`, `currency` (boş ise EUR), `account`, `canPct` (opsiyonel), `tugcePct` (opsiyonel), `tag`, `note`.

Hesaplanan alanlar (saklanmaz): `monthKey` (YYYY-AA), `rate`, `amountEUR`, `budgetType`, `payer`, `ratio`, `canShare`, `tugceShare`, `validation`.

### incomes (gelirler)

`date`, `source`, `person`, `amount`, `currency`, `account`, `note`. Person zorunlu; kişisel bütçeler buradan beslenir.

### transfers (transferler)

`date`, `type` (Ortak Kasa Katkısı / Kişiden Kişiye / Tasarruf), `from`, `to`, `amount`, `currency`, `fromAccount`, `toAccount`, `goalId`, `note`. Transfer harcama değildir, harcama toplamlarına girmez.

### recurring (sabit giderler)

`name`, `budgetType`, `category`, `amount`, `frequencyMonths` (1/3/6/12), `account`, `firstPaymentDate`, `active`, `note`.

### goals (tasarruf hedefleri)

`name`, `targetAmount`, `targetDate`, `owner`, `note`. Biriken tutar transfers üzerinden hesaplanır.

### budgets (aylık plan)

Ortak kategori limitleri ve kişisel plan. `monthKey`, `budgetType`, `category`, `limit`, `person`.

### settings

Hesaplar (ad, para birimi, sahibi), kategoriler (ad, bütçe tipi), gelir kaynakları, aylık EUR/TRY kur tablosu ve varsayılan kur, Sperrkonto takibi (toplam, çekilen, kalan).

---

## 5. İş Kuralları (Excel'den birebir taşınacak)

Bunlar uygulamanın çekirdeğidir. Hiçbiri sadeleştirilmez, hepsi test edilir.

**Bütçe tipleri:** Ortak-Ev, Ortak-Dışarı, Mike, Kişisel-Can, Kişisel-Tuğçe, Taşınma.

**Bütçe tipi kategoriden gelir.** Kullanıcı bütçe tipi seçmez. Kategori "Kişisel" tipindeyse Can mı Tuğçe mi olduğu paylaşım oranından belirlenir.

**Ödeyen hesaptan gelir.** Her hesabın bir sahibi vardır (Can, Tuğçe veya Ortak Kasa). Kullanıcı ödeyen seçmez.

**Paylaşım oranı çözümü, bu sırayla:**

1. `canPct` doluysa oran budur.
2. `tugcePct` doluysa oran = 1 - tugcePct.
3. İkisi de boşsa ve kategori tipi Kişisel veya Taşınma ise, oran hesabın sahibine göre: Can ise 1, Tuğçe ise 0, Ortak Kasa ise 0.5.
4. Diğer tüm durumlarda 0.5.

**Para birimi boşsa EUR.** TRY girildiğinde o ayın kuru uygulanır; o ay için kur girilmemişse varsayılan kur kullanılır ve kullanıcı uyarılır.

**Doğrulama kuralları:** kategori, tutar veya hesap eksikse hata. Kategori listede yoksa hata. Hesap listede yoksa hata. Can % ve Tuğçe % birlikte girilmiş ve toplamı 100 değilse hata. Kişisel kategoride oran 1 veya 0 değilse hata.

**Sperrkonto hesap değildir.** Bloke paranın kendisi varlık listesinde durmaz; aylık serbest bırakılan tutar gelir olarak girilir ve Girokonto bakiyesine eklenir. Kalan bloke tutar ayrı gösterilir.

**Katkı özeti, borç değildir.** Kişi başına: doğrudan ödediği, Ortak Kasa'ya koyduğu, kişiden kişiye net transferi, toplam katkısı, kendi payı, fark. Fark hesaplanırken Ortak Kasa'nın harcanmamış bakiyesinin yarısı düşülür. İki kişinin farkı toplamı sıfır olmalıdır; bu bir kontrol koşuludur. Arayüzde "kim kime borçlu" dili kullanılmaz, yalnızca "toplamda X kadar önde" denir.

**Kişisel bütçe sıfır bazlıdır.** Planlanan gelir; ortak payı, kişisel harcama ve tasarruf olarak dağıtılır. Atanmamış para sıfır olmalıdır.

**Sabit giderler plandır, harcama değildir.** Plan tutarları hiçbir gerçekleşen toplamına eklenmez.

---

## 6. Excel'in Yapamadığı, Uygulamanın Yapması Gerekenler

Bu bölüm projenin asıl gerekçesidir.

1. **Yinelenen kayıt üretimi.** Sabit giderler vadesi geldiğinde taslak harcama olarak otomatik oluşur. Kullanıcı tutarı teyit edip onaylar veya atlar. Onaylanmadan hiçbir kayıt gerçekleşen sayılmaz. Aynı kalem aynı dönem için iki kez üretilmez; üretim istemci tarafında, uygulama açıldığında idempotent şekilde yapılır.
2. **Hatırlatma.** Yaklaşan sabit ödemeler ve ay sonunda hâlâ onaylanmamış taslaklar için uyarı. Push bildirimi ücretsiz katmanda mümkün mü, teyit edilir; değilse uygulama içi uyarı ile yetinilir.
3. **Hızlı giriş.** Telefonda tek ekran, en fazla beş dokunuş: tutar, kategori (son kullanılanlar üstte), hesap (varsayılan hatırlanır), açıklama, kaydet. Tarih varsayılan bugündür.
4. **Kur otomatiği.** Aylık EUR/TRY kuru bir kaynaktan çekilir, elle geçersiz kılınabilir. Kaynak ve çekim sıklığı ücretsiz katmana uygun olmalı.
5. **Fiş fotoğrafı.** Harcamaya görsel eklenebilir. Storage maliyeti ücretsiz katmanda mı, teyit edilir; değilse bu özellik ertelenir.
6. **Mükerrer kayıt uyarısı.** Aynı gün, aynı tutar, aynı kategori girilirse uyarı verilir, engellenmez.
7. **Banka ekstresi içe aktarma.** CSV yükleyip kategori eşlemesiyle toplu giriş. İkinci aşama işi.
8. **Ay kapanışı akışı.** Tek ekranda: kontroller, eksik sabit giderler, hedeflere ayrılan tutar, katkı farkı. Adım adım yürütülür.
9. **Offline giriş.** İnternet yokken kayıt girilebilir, bağlantı gelince senkronize olur.
10. **Excel içe/dışa aktarma.** Mevcut v9 dosyasından ilk verinin aktarılması ve her ay yedek olarak dışa aktarma.

---

## 7. Raporlar

Excel'deki Ozet, Hesaplar, Ortak_Butce, Butce_Can, Butce_Tugce, Hedefler ve Sabit_Giderler sayfalarının karşılığı:

- Ay panosu: bütçe tipi bazında harcama, limit, kalan, kullanım yüzdesi
- Kategori kırılımı ve en büyük beş kategori
- Gelir, harcama, tasarruf, net
- Taşınma harcamaları ayrı gösterilir, aylık ortalamalara karışmaz
- Kişisel bütçeler: plan, gerçekleşen, harcanabilir kalan, günlük harcanabilir
- Aylık gelişim tablosu ve gelecek ay tahmini
- Hesap bakiyeleri ve net varlık
- Katkı özeti
- Tasarruf hedefleri: biriken, kalan, aylık gereken
- Sabit gider takvimi: sonraki ödeme, kalan gün, bu ay girildi mi
- Kontroller bloğu: her satır OK ise veri tutarlıdır

---

## 8. Güvenlik

- Yalnızca iki kimliği doğrulanmış kullanıcı okuyup yazabilir. Firestore kurallarında uid beyaz listesi.
- Kural dosyası kod tarafından değil, açıkça yazılıp emulator ile test edilir.
- Uygulama herkese açık bir adreste yayınlanacağı için, kimlik doğrulanmadan hiçbir veri okunamaz.
- Kişisel finansal veri söz konusu; hiçbir analitik veya üçüncü taraf izleme eklenmez.

---

## 9. Yol Haritası

Her aşama tek başına çalışır durumda teslim edilir. Bir sonraki aşamaya, bir öncekiyle gerçek veri girilip test edilmeden geçilmez.

1. Firebase projesi, kimlik doğrulama, kurallar, boş iskelet, canlıya alma
2. settings (hesaplar, kategoriler, kurlar) ve harcama girişi, doğrulama kuralları
3. Gelirler, transferler, hesap bakiyeleri
4. Ay panosu ve kategori kırılımı
5. Sabit giderler ve otomatik taslak üretimi
6. Kişisel bütçeler, hedefler, katkı özeti
7. Excel içe aktarma, dışa aktarma, offline, PWA
8. Hızlı giriş ekranı ve hatırlatmalar

---

## 10. Cevap Kuralları

1. Önce kısa cevap, sonra detay. İlk iki üç cümle sonucu versin.
2. Türkçe yaz. Kod, alan adları ve teknik terimler İngilizce kalır.
3. Uzun tire kullanma.
4. Yapay zeka üslubu kullanma. Gereksiz giriş cümlesi, gereksiz özet paragrafı, abartılı övgü yok.
5. Emin olmadığın yerde "emin değilim, doğrulanması gerekiyor" de. Uydurma limit, uydurma fiyat, uydurma API adı verme.
6. Firebase limitleri, fiyatlandırma ve ücretsiz katman kapsamı içeren her cevaptan önce güncel resmi dokümantasyona bak. Hafızadan rakam verme.
7. Kod verirken çalışan tam dosya ver, parça parça yamayla vakit kaybettirme. Büyük dosyalarda hangi bölümün değiştiğini belirt.
8. İş kurallarını değiştiren her öneride, Excel'deki karşılığının ne olduğunu ve neyin bozulacağını söyle.
9. Her cevabın sonunda, varsa, bir sonraki adım ve varsa son tarih belirt.

---

## 11. Yapılmayacaklar

- Ücretsiz katmanı aşan bir çözümü, maliyetini yazmadan önerme.
- Excel'de olmayan kavramı sessizce ekleme.
- Hesaplanmış değeri veritabanına yazma.
- Borç, alacak, ödeme emri dilini arayüze sokma.
- Onaylanmamış otomatik kaydı gerçekleşen harcama sayma.
- Kullanıcının sormadığı konuyu açıp cevabı şişirme.
