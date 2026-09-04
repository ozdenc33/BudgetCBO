import { describe, expect, it } from 'vitest'
import {
  toGoal,
  toIncome,
  toRecurringItem,
  toRecurringSkip,
  toSettings,
  toTransaction,
  toTransfer,
} from './normalize'

// Bu testler "bozuk veriyi uydurma" kuralini korur: eksik/gecersiz bir
// tutar 0'a cevrilmez, alan hic gelmez ve mevcut dogrulama satiri
// kullaniciya "Eksik alan" der.

describe('toTransaction', () => {
  it('saglam kaydi oldugu gibi gecirir', () => {
    const tx = toTransaction('t1', {
      date: '2026-07-15',
      description: 'Market',
      category: 'Market (Ev)',
      amount: 42.5,
      currency: 'EUR',
      account: 'Ortak Kasa',
      canPct: 0.5,
      tag: 'haftalik',
    })
    expect(tx).toEqual({
      id: 't1',
      date: '2026-07-15',
      description: 'Market',
      category: 'Market (Ev)',
      amount: 42.5,
      currency: 'EUR',
      account: 'Ortak Kasa',
      canPct: 0.5,
      tag: 'haftalik',
    })
  })

  it('sayiya cevrilemeyen tutari 0 yapmaz, alani hic yazmaz', () => {
    expect(toTransaction('t2', { amount: 'abc' }).amount).toBeUndefined()
    expect(toTransaction('t3', { amount: null }).amount).toBeUndefined()
    expect(toTransaction('t4', {}).amount).toBeUndefined()
    expect(toTransaction('t5', { amount: Number.NaN }).amount).toBeUndefined()
  })

  it('secondAccount varsa gecirir, yoksa hic yazmaz', () => {
    expect(toTransaction('t6', { secondAccount: 'Tuğçe-DE Girokonto' }).secondAccount).toBe(
      'Tuğçe-DE Girokonto',
    )
    expect(toTransaction('t7', {}).secondAccount).toBeUndefined()
  })

  it('metin olarak saklanan sayiyi cevirir (virgul dahil)', () => {
    expect(toTransaction('t6', { amount: '42.5' }).amount).toBe(42.5)
    expect(toTransaction('t7', { amount: '42,5' }).amount).toBe(42.5)
  })

  it('taninmayan para birimini bos birakir', () => {
    expect(toTransaction('t8', { currency: 'USD' }).currency).toBe('')
    expect(toTransaction('t9', { currency: 'TRY' }).currency).toBe('TRY')
  })

  it('0-1 disindaki paylasim oranini yok sayar', () => {
    expect(toTransaction('t10', { canPct: 50 }).canPct).toBeUndefined()
    expect(toTransaction('t11', { canPct: -0.2 }).canPct).toBeUndefined()
    expect(toTransaction('t12', { canPct: 1 }).canPct).toBe(1)
    expect(toTransaction('t13', { canPct: 0 }).canPct).toBe(0)
  })

  it('metin olmayan alanlari bos metne cevirir', () => {
    const tx = toTransaction('t14', { description: 42, category: null })
    expect(tx.description).toBe('')
    expect(tx.category).toBe('')
  })
})

describe('toIncome', () => {
  it('taninmayan kisiyi varsayilana cevirir', () => {
    expect(toIncome('i1', { person: 'Ahmet' }).person).toBe('Can')
    expect(toIncome('i2', { person: 'Tuğçe' }).person).toBe('Tuğçe')
  })

  it('bos notu hic yazmaz', () => {
    expect(toIncome('i3', { note: '' }).note).toBeUndefined()
  })
})

describe('toTransfer', () => {
  it('gecerli tipi korur, gecersizi bos birakir', () => {
    expect(toTransfer('tr1', { type: 'Tasarruf' }).type).toBe('Tasarruf')
    expect(toTransfer('tr2', { type: 'Baska' }).type).toBe('')
  })
})

describe('toGoal', () => {
  it('taninmayan sahibi Ortak yapar', () => {
    expect(toGoal('g1', { owner: 'X' }).owner).toBe('Ortak')
    expect(toGoal('g2', { owner: 'Can' }).owner).toBe('Can')
  })

  it('hedef tutari yoksa alani yazmaz', () => {
    expect(toGoal('g3', {}).targetAmount).toBeUndefined()
  })
})

describe('toRecurringItem', () => {
  it('gecersiz sikligi aylik kabul eder', () => {
    expect(toRecurringItem('r1', { frequencyMonths: 5 }).frequencyMonths).toBe(1)
    expect(toRecurringItem('r2', { frequencyMonths: 12 }).frequencyMonths).toBe(12)
  })

  it('active alani yoksa aktif sayar, false ise pasif', () => {
    expect(toRecurringItem('r3', {}).active).toBe(true)
    expect(toRecurringItem('r4', { active: false }).active).toBe(false)
  })

  it('taninmayan butce tipini varsayilana cevirir', () => {
    expect(toRecurringItem('r5', { budgetType: 'Kişisel' }).budgetType).toBe('Ortak-Ev')
    expect(toRecurringItem('r6', { budgetType: 'Mike' }).budgetType).toBe('Mike')
  })

  it('kind alani yoksa (eski kayit) "expense" varsayilir', () => {
    const item = toRecurringItem('r7', { budgetType: 'Ortak-Ev', category: 'Kira (Kaltmiete)' })
    expect(item.kind).toBe('expense')
    expect(item.budgetType).toBe('Ortak-Ev')
    expect(item.category).toBe('Kira (Kaltmiete)')
    expect(item.person).toBeUndefined()
  })

  it('kind=income icin budgetType/category yazilmaz, person normallesir', () => {
    const item = toRecurringItem('r8', { kind: 'income', person: 'Tuğçe' })
    expect(item.kind).toBe('income')
    expect(item.person).toBe('Tuğçe')
    expect(item.budgetType).toBeUndefined()
    expect(item.category).toBeUndefined()
  })

  it('taninmayan person yok sayilir', () => {
    const item = toRecurringItem('r9', { kind: 'income', person: 'Ahmet' })
    expect(item.person).toBeUndefined()
  })

  it('paymentCount pozitif tam sayiya yuvarlanir, sifir/negatif yok sayilir', () => {
    expect(toRecurringItem('r10', { paymentCount: 12.7 }).paymentCount).toBe(13)
    expect(toRecurringItem('r11', { paymentCount: 0 }).paymentCount).toBeUndefined()
    expect(toRecurringItem('r12', { paymentCount: -5 }).paymentCount).toBeUndefined()
    expect(toRecurringItem('r13', {}).paymentCount).toBeUndefined()
  })

  it('currency (KYK kredisi gibi TL sabit gelir) gecerse gecirir, taninmazsa hic yazmaz', () => {
    expect(toRecurringItem('r14', { currency: 'TRY' }).currency).toBe('TRY')
    expect(toRecurringItem('r15', { currency: 'USD' }).currency).toBeUndefined()
    expect(toRecurringItem('r16', {}).currency).toBeUndefined()
  })
})

describe('toRecurringSkip', () => {
  it('alanlari metne cevirir', () => {
    expect(toRecurringSkip('s1', { recurringId: 'r1', monthKey: '2026-07' })).toEqual({
      id: 's1',
      recurringId: 'r1',
      monthKey: '2026-07',
    })
  })
})

describe('toSettings', () => {
  // Gercek senaryo: firestore.rules personalPlans'i hic dogrulamaz, bu
  // yuzden bu alt-alanlar eksik bir dokuman kurallardan gecebilir.
  // Onceden `snap.data() as Settings` bunu yakalamiyordu; Kişisel Bütçe
  // sayfasi `plan.incomePlan[source.name]` uzerinde
  // "Cannot read properties of undefined" ile cokuyordu.
  it('personalPlans hic yoksa cokmeden makul varsayilanlarla doldurur', () => {
    const s = toSettings({
      accounts: [],
      categories: [],
      incomeSources: [],
      rates: {},
      defaultRate: 34,
    })
    expect(s.personalPlans.Can).toEqual({
      incomePlan: {},
      sharedContributionPlanEUR: 0,
      categoryPlan: {},
      savingsPlanEUR: 0,
    })
    expect(s.personalPlans['Tuğçe']).toEqual({
      incomePlan: {},
      sharedContributionPlanEUR: 0,
      categoryPlan: {},
      savingsPlanEUR: 0,
    })
  })

  it('personalPlans kismen doluysa eksik alt-alanlari tamamlar', () => {
    const s = toSettings({
      personalPlans: { Can: { incomePlan: { Maaş: 2000 } } },
    })
    expect(s.personalPlans.Can).toEqual({
      incomePlan: { Maaş: 2000 },
      sharedContributionPlanEUR: 0,
      categoryPlan: {},
      savingsPlanEUR: 0,
    })
  })

  it('incomeSources active alani eksikse true varsayar (kontrolsuz checkbox uyarisini onler)', () => {
    const s = toSettings({
      incomeSources: [{ id: 'maas', name: 'Maaş' }],
    })
    expect(s.incomeSources).toEqual([{ id: 'maas', name: 'Maaş', active: true }])
  })

  it('accounts/categories dizi degilse bos dizi kabul eder, cokmez', () => {
    const s = toSettings({ accounts: null, categories: undefined })
    expect(s.accounts).toEqual([])
    expect(s.categories).toEqual([])
  })

  it('defaultRate eksikse DEFAULT_RATE varsayar, sıfıra bolme (Infinity) olusturmaz', () => {
    const s = toSettings({})
    expect(s.defaultRate).toBeGreaterThan(0)
  })

  it('rates icindeki gecersiz degerleri atlar', () => {
    const s = toSettings({ rates: { '2026-07': 35.2, '2026-08': 'bozuk' } })
    expect(s.rates).toEqual({ '2026-07': 35.2 })
  })

  // Gercek senaryo: fxSpreadPct dokumanda hic yoksa (eski kayit, ya da
  // Ayarlar'dan hic degistirilmemis), onceki halinde
  // `fxSpreadPct: optNum(...)` DOGRUDAN atanip anahtar `undefined`
  // degeriyle nesnede KALIYORDU. Firestore setDoc(), degeri undefined
  // olan bir alani nesnede gormek istemiyor (anahtar hic olmamali) ve
  // "invalid-argument" ile reddediyor. Kişisel Bütçe sayfasi
  // `{...settings, personalPlans: {...}}` seklinde TUM settings'i geri
  // yazdigi icin bu, "Plan kaydedilemedi: Kayıt biçimi geçersiz"
  // hatasi olarak kullaniciya cikiyordu.
  it('fxSpreadPct yoksa anahtar hic eklenmez (Firestore undefined degerli alani reddeder)', () => {
    const s = toSettings({})
    expect('fxSpreadPct' in s).toBe(false)
  })

  it('fxSpreadPct sayi ise dogru sekilde eklenir', () => {
    const s = toSettings({ fxSpreadPct: 1.5 })
    expect(s.fxSpreadPct).toBe(1.5)
  })

  it('normalize edilmis settings dogrudan JSON tur uyumludur (undefined degerli alan yok)', () => {
    const s = toSettings({})
    for (const [key, value] of Object.entries(s)) {
      expect(value, `${key} undefined olmamali`).not.toBeUndefined()
    }
  })
})
