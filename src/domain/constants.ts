import type { Account, Category, IncomeSource, Settings } from './types'

// Asagidaki listeler Ortak_Butce_v9.xlsx > Ayarlar sayfasindan birebir
// alinmistir (G4:I11 hesaplar, P4:Q45 kategoriler, A13:B20 gelir
// kaynaklari, K1 varsayilan kur, M3:N4 Sperrkonto). Uygulama ilk
// acildiginda settings/app dokumani yoksa bu degerlerle bir kerelik
// tohumlanir (bkz. src/lib/firestoreSettings.ts). Kullanici sonradan
// Ayarlar ekranindan ekleyip cikarabilir.

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'can-de-girokonto', name: 'Can-DE Girokonto', currency: 'EUR', owner: 'Can', startingBalanceEUR: 0 },
  { id: 'can-tr-banka', name: 'Can-TR Banka', currency: 'TRY', owner: 'Can', startingBalanceEUR: 0 },
  { id: 'can-tasarruf', name: 'Can-Tasarruf', currency: 'EUR', owner: 'Can', startingBalanceEUR: 0 },
  { id: 'can-nakit', name: 'Can-Nakit', currency: 'EUR', owner: 'Can', startingBalanceEUR: 0 },
  { id: 'tugce-de-girokonto', name: 'Tuğçe-DE Girokonto', currency: 'EUR', owner: 'Tuğçe', startingBalanceEUR: 0 },
  { id: 'tugce-tasarruf', name: 'Tuğçe-Tasarruf', currency: 'EUR', owner: 'Tuğçe', startingBalanceEUR: 0 },
  { id: 'tugce-nakit', name: 'Tuğçe-Nakit', currency: 'EUR', owner: 'Tuğçe', startingBalanceEUR: 0 },
  { id: 'ortak-kasa', name: 'Ortak Kasa', currency: 'EUR', owner: 'Ortak Kasa', startingBalanceEUR: 0 },
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'kira-kaltmiete', name: 'Kira (Kaltmiete)', budgetType: 'Ortak-Ev' },
  { id: 'nebenkosten', name: 'Nebenkosten', budgetType: 'Ortak-Ev' },
  { id: 'elektrik-gaz', name: 'Elektrik/Gaz', budgetType: 'Ortak-Ev' },
  { id: 'internet', name: 'Internet', budgetType: 'Ortak-Ev' },
  { id: 'rundfunkbeitrag', name: 'Rundfunkbeitrag', budgetType: 'Ortak-Ev' },
  { id: 'market-ev', name: 'Market (Ev)', budgetType: 'Ortak-Ev' },
  { id: 'temizlik-sarf', name: 'Temizlik/Sarf', budgetType: 'Ortak-Ev' },
  { id: 'ev-esyasi', name: 'Ev Eşyası', budgetType: 'Ortak-Ev' },
  { id: 'tamir-bakim', name: 'Tamir/Bakım', budgetType: 'Ortak-Ev' },
  { id: 'restoran-kafe', name: 'Restoran/Kafe', budgetType: 'Ortak-Dışarı' },
  { id: 'bar-icecek', name: 'Bar/İçecek', budgetType: 'Ortak-Dışarı' },
  { id: 'sinema-etkinlik', name: 'Sinema/Etkinlik', budgetType: 'Ortak-Dışarı' },
  { id: 'seyahat-ulasim', name: 'Seyahat-Ulaşım', budgetType: 'Ortak-Dışarı' },
  { id: 'konaklama', name: 'Konaklama', budgetType: 'Ortak-Dışarı' },
  { id: 'gezi-muze', name: 'Gezi/Müze', budgetType: 'Ortak-Dışarı' },
  { id: 'hediye', name: 'Hediye', budgetType: 'Ortak-Dışarı' },
  { id: 'kisisel-market', name: 'Kişisel Market', budgetType: 'Kişisel' },
  { id: 'giyim', name: 'Giyim', budgetType: 'Kişisel' },
  { id: 'saglik-ilac', name: 'Sağlık/İlaç', budgetType: 'Kişisel' },
  { id: 'sigorta', name: 'Sigorta', budgetType: 'Kişisel' },
  { id: 'telefon', name: 'Telefon', budgetType: 'Kişisel' },
  { id: 'ulasim-d-ticket', name: 'Ulaşım (D-Ticket)', budgetType: 'Kişisel' },
  { id: 'egitim-kurs', name: 'Eğitim/Kurs', budgetType: 'Kişisel' },
  { id: 'hobi-fotograf', name: 'Hobi/Fotoğraf', budgetType: 'Kişisel' },
  { id: 'abonelikler', name: 'Abonelikler', budgetType: 'Kişisel' },
  { id: 'spor', name: 'Spor', budgetType: 'Kişisel' },
  { id: 'kuafor-bakim', name: 'Kuaför/Bakım', budgetType: 'Kişisel' },
  { id: 'semester-beitrag', name: 'Semester Beitrag', budgetType: 'Kişisel' },
  { id: 'kisisel-diger', name: 'Kişisel Diğer', budgetType: 'Kişisel' },
  { id: 'mama', name: 'Mama', budgetType: 'Mike' },
  { id: 'kum', name: 'Kum', budgetType: 'Mike' },
  { id: 'veteriner', name: 'Veteriner', budgetType: 'Mike' },
  { id: 'kedi-ekipman', name: 'Kedi Ekipman', budgetType: 'Mike' },
  { id: 'vize-konsolosluk', name: 'Vize/Konsolosluk', budgetType: 'Taşınma' },
  { id: 'sperrkonto-ucret', name: 'Sperrkonto Ücret', budgetType: 'Taşınma' },
  { id: 'ucak-bileti', name: 'Uçak Bileti', budgetType: 'Taşınma' },
  { id: 'kedi-evrak-nakil', name: 'Kedi Evrak/Nakil', budgetType: 'Taşınma' },
  { id: 'kaution', name: 'Kaution', budgetType: 'Taşınma' },
  { id: 'mobilya-kurulum', name: 'Mobilya/Kurulum', budgetType: 'Taşınma' },
  { id: 'kargo-tasima', name: 'Kargo/Taşıma', budgetType: 'Taşınma' },
  { id: 'resmi-harclar', name: 'Resmi Harçlar', budgetType: 'Taşınma' },
  { id: 'tasinma-diger', name: 'Taşınma Diğer', budgetType: 'Taşınma' },
]

export const DEFAULT_INCOME_SOURCES: IncomeSource[] = [
  { id: 'maas', name: 'Maaş', active: true },
  { id: 'hiwi', name: 'HiWi', active: false },
  { id: 'werkstudent', name: 'Werkstudent', active: true },
  { id: 'sperrkonto', name: 'Sperrkonto', active: true },
  { id: 'aile-destegi', name: 'Aile Desteği', active: true },
  { id: 'burs', name: 'Burs', active: true },
  { id: 'kaution-iadesi', name: 'Kaution İadesi', active: true },
  { id: 'diger', name: 'Diğer', active: true },
]

export const DEFAULT_RATE = 48

export const DEFAULT_SETTINGS: Settings = {
  accounts: DEFAULT_ACCOUNTS,
  categories: DEFAULT_CATEGORIES,
  incomeSources: DEFAULT_INCOME_SOURCES,
  rates: {},
  defaultRate: DEFAULT_RATE,
  sperrkonto: { totalEUR: null, monthlyReleaseEUR: 992 },
}

export const TRANSFER_TYPES = ['Ortak Kasa Katkısı', 'Kişiden Kişiye', 'Tasarruf'] as const

export const PERSONS = ['Can', 'Tuğçe'] as const
