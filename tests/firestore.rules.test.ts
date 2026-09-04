import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// firestore.rules dosyasinin gercekten dedigini yaptigini dogrular.
// Emulator gerektirir; `npm run test:rules` ile calisir.

const CAN_UID = 'Ml3QFPvFMGV9w9SfPWOR97xKxnQ2'
const TUGCE_UID = 'Zo4l8zyn0TSKyf3ylXqQFELlG2R2'
const STRANGER_UID = 'yabanci-uid'

let testEnv: RulesTestEnvironment

const validTransaction = {
  date: '2026-07-15',
  description: 'Market',
  category: 'Market (Ev)',
  amount: 42.5,
  currency: 'EUR',
  account: 'Ortak Kasa',
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'budgetcbo-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

describe('kimlik kontrolu', () => {
  it('izinli kullanici yazabilir ve okuyabilir', async () => {
    const db = testEnv.authenticatedContext(CAN_UID).firestore()
    await assertSucceeds(setDoc(doc(db, 'transactions/t1'), validTransaction))
    await assertSucceeds(getDoc(doc(db, 'transactions/t1')))
  })

  it('ikinci izinli kullanici da yazabilir', async () => {
    const db = testEnv.authenticatedContext(TUGCE_UID).firestore()
    await assertSucceeds(setDoc(doc(db, 'transactions/t2'), validTransaction))
  })

  it('listede olmayan kullanici okuyamaz ve yazamaz', async () => {
    const db = testEnv.authenticatedContext(STRANGER_UID).firestore()
    await assertFails(setDoc(doc(db, 'transactions/t3'), validTransaction))
    await assertFails(getDoc(doc(db, 'transactions/t3')))
  })

  it('giris yapmamis kullanici okuyamaz ve yazamaz', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, 'transactions/t4'), validTransaction))
    await assertFails(getDoc(doc(db, 'transactions/t4')))
  })
})

describe('harcama semasi', () => {
  const db = () => testEnv.authenticatedContext(CAN_UID).firestore()

  it('gecerli kaydi kabul eder', async () => {
    await assertSucceeds(setDoc(doc(db(), 'transactions/ok'), validTransaction))
  })

  it('tutar metin ise reddeder', async () => {
    await assertFails(
      setDoc(doc(db(), 'transactions/bad'), { ...validTransaction, amount: '42.5' }),
    )
  })

  it('tarih bicimi yanlissa reddeder', async () => {
    await assertFails(
      setDoc(doc(db(), 'transactions/bad'), { ...validTransaction, date: '15.07.2026' }),
    )
    await assertFails(
      setDoc(doc(db(), 'transactions/bad'), { ...validTransaction, date: '2026-7-5' }),
    )
  })

  it('taninmayan para birimini reddeder', async () => {
    await assertFails(
      setDoc(doc(db(), 'transactions/bad'), { ...validTransaction, currency: 'USD' }),
    )
  })

  it('zorunlu alan eksikse reddeder', async () => {
    const { amount: _amount, ...withoutAmount } = validTransaction
    await assertFails(setDoc(doc(db(), 'transactions/bad'), withoutAmount))
  })

  it('opsiyonel alanlar yoksa kabul eder', async () => {
    await assertSucceeds(setDoc(doc(db(), 'transactions/ok2'), validTransaction))
  })

  it('ice aktarma etiketini kabul eder', async () => {
    await assertSucceeds(
      setDoc(doc(db(), 'transactions/ok3'), { ...validTransaction, importBatchId: 'import-1' }),
    )
  })

  it('bolusuk cekilis icin secondAccount kabul eder', async () => {
    await assertSucceeds(
      setDoc(doc(db(), 'transactions/ok4'), {
        ...validTransaction,
        secondAccount: 'Tuğçe-DE Girokonto',
        canPct: 0.5,
        tugcePct: 0.5,
      }),
    )
  })

  it('silmeyi sema dogrulamasina takmaz', async () => {
    await setDoc(doc(db(), 'transactions/del'), validTransaction)
    await assertSucceeds(deleteDoc(doc(db(), 'transactions/del')))
  })

  it('gecerli enteredBy kabul eder', async () => {
    await assertSucceeds(
      setDoc(doc(db(), 'transactions/ok5'), { ...validTransaction, enteredBy: 'Tuğçe' }),
    )
  })

  it('gecersiz enteredBy reddeder', async () => {
    await assertFails(
      setDoc(doc(db(), 'transactions/bad2'), { ...validTransaction, enteredBy: 'Baskasi' }),
    )
  })
})

describe('gelir ve transfer semasi', () => {
  const db = () => testEnv.authenticatedContext(CAN_UID).firestore()

  it('taninmayan kisiyi reddeder', async () => {
    await assertFails(
      setDoc(doc(db(), 'incomes/bad'), {
        date: '2026-07-01',
        source: 'Maaş',
        person: 'Ahmet',
        amount: 100,
        currency: 'EUR',
        account: 'Can-DE Girokonto',
      }),
    )
  })

  it('taninmayan transfer tipini reddeder', async () => {
    await assertFails(
      setDoc(doc(db(), 'transfers/bad'), {
        date: '2026-07-01',
        type: 'Baska',
        from: 'Can',
        to: 'Ortak Kasa',
        amount: 100,
        currency: 'EUR',
      }),
    )
  })

  it('gecerli transferi kabul eder', async () => {
    await assertSucceeds(
      setDoc(doc(db(), 'transfers/ok'), {
        date: '2026-07-01',
        type: 'Ortak Kasa Katkısı',
        from: 'Can',
        to: 'Ortak Kasa',
        amount: 100,
        currency: 'EUR',
        fromAccount: 'Can-DE Girokonto',
        toAccount: 'Ortak Kasa',
      }),
    )
  })
})

describe('sabit gider semasi', () => {
  const db = () => testEnv.authenticatedContext(CAN_UID).firestore()

  const validRecurring = {
    name: 'Kira',
    kind: 'expense',
    budgetType: 'Ortak-Ev',
    category: 'Kira (Kaltmiete)',
    amount: 900,
    frequencyMonths: 1,
    account: 'Ortak Kasa',
    firstPaymentDate: '2026-01-01',
    active: true,
  }

  it('gecerli kalemi kabul eder', async () => {
    await assertSucceeds(setDoc(doc(db(), 'recurring/ok'), validRecurring))
  })

  it('gecersiz sikligi reddeder', async () => {
    await assertFails(setDoc(doc(db(), 'recurring/bad'), { ...validRecurring, frequencyMonths: 5 }))
  })

  it('tutari olmayan kalemi kabul eder (plan belirsiz olabilir)', async () => {
    const { amount: _amount, ...withoutAmount } = validRecurring
    await assertSucceeds(setDoc(doc(db(), 'recurring/ok2'), withoutAmount))
  })

  it('kind alani eksikse reddeder (eski Excel-donemi kaydi degil, yeni yazma)', async () => {
    const { kind: _kind, ...withoutKind } = validRecurring
    await assertFails(setDoc(doc(db(), 'recurring/bad2'), withoutKind))
  })

  it('kind=expense icin kategori/butce eksikse reddeder', async () => {
    const { category: _category, ...withoutCategory } = validRecurring
    await assertFails(setDoc(doc(db(), 'recurring/bad3'), withoutCategory))
  })

  it('kind=income icin gecerli kalemi (kisi ile, kategorisiz) kabul eder', async () => {
    await assertSucceeds(
      setDoc(doc(db(), 'recurring/income-ok'), {
        name: 'KYK Kredisi',
        kind: 'income',
        person: 'Can',
        amount: 2500,
        frequencyMonths: 1,
        account: 'Can-DE Girokonto',
        firstPaymentDate: '2026-01-05',
        active: true,
        paymentCount: 12,
      }),
    )
  })

  it('kind=income icin gecerli kisi yoksa reddeder', async () => {
    await assertFails(
      setDoc(doc(db(), 'recurring/income-bad'), {
        name: 'KYK Kredisi',
        kind: 'income',
        frequencyMonths: 1,
        account: 'Can-DE Girokonto',
        firstPaymentDate: '2026-01-05',
        active: true,
      }),
    )
  })

  it('paymentCount metin ise reddeder', async () => {
    await assertFails(
      setDoc(doc(db(), 'recurring/bad4'), { ...validRecurring, paymentCount: '12' }),
    )
  })
})

describe('ayarlar semasi', () => {
  const db = () => testEnv.authenticatedContext(CAN_UID).firestore()

  it('gecerli ayarlari kabul eder', async () => {
    await assertSucceeds(
      setDoc(doc(db(), 'settings/app'), {
        accounts: [],
        categories: [],
        incomeSources: [],
        rates: {},
        defaultRate: 35,
      }),
    )
  })

  it('defaultRate metin ise reddeder', async () => {
    await assertFails(
      setDoc(doc(db(), 'settings/app'), {
        accounts: [],
        categories: [],
        incomeSources: [],
        rates: {},
        defaultRate: '35',
      }),
    )
  })

  it('fxSpreadPct sayi ise kabul eder, metinse reddeder', async () => {
    await assertSucceeds(
      setDoc(doc(db(), 'settings/app'), {
        accounts: [],
        categories: [],
        incomeSources: [],
        rates: {},
        defaultRate: 35,
        fxSpreadPct: 1.5,
      }),
    )
    await assertFails(
      setDoc(doc(db(), 'settings/app'), {
        accounts: [],
        categories: [],
        incomeSources: [],
        rates: {},
        defaultRate: 35,
        fxSpreadPct: '1.5',
      }),
    )
  })

  const validPersonalPlan = {
    incomePlan: { Maaş: 2000 },
    sharedContributionPlanEUR: 400,
    categoryPlan: {},
    savingsPlanEUR: 200,
  }

  it('gecerli sekilli personalPlans kabul eder', async () => {
    await assertSucceeds(
      setDoc(doc(db(), 'settings/app'), {
        accounts: [],
        categories: [],
        incomeSources: [],
        rates: {},
        defaultRate: 35,
        personalPlans: { Can: validPersonalPlan, Tuğçe: validPersonalPlan },
      }),
    )
  })

  it('personalPlans eksik alt-alanla reddeder (Kişisel Bütçe çökme riski)', async () => {
    await assertFails(
      setDoc(doc(db(), 'settings/app'), {
        accounts: [],
        categories: [],
        incomeSources: [],
        rates: {},
        defaultRate: 35,
        // incomePlan bilerek eksik birakildi.
        personalPlans: {
          Can: {
            sharedContributionPlanEUR: 400,
            categoryPlan: {},
            savingsPlanEUR: 200,
          },
          Tuğçe: validPersonalPlan,
        },
      }),
    )
  })

  it('personalPlans Tuğçe tarafi eksikse reddeder', async () => {
    await assertFails(
      setDoc(doc(db(), 'settings/app'), {
        accounts: [],
        categories: [],
        incomeSources: [],
        rates: {},
        defaultRate: 35,
        personalPlans: { Can: validPersonalPlan },
      }),
    )
  })
})

describe('atlanan sabit giderler', () => {
  it('ay anahtari bicimini dogrular', async () => {
    const db = testEnv.authenticatedContext(CAN_UID).firestore()
    await assertSucceeds(
      setDoc(doc(db, 'recurringSkips/s1'), { recurringId: 'r1', monthKey: '2026-07' }),
    )
    await assertFails(
      setDoc(doc(db, 'recurringSkips/s2'), { recurringId: 'r1', monthKey: '2026-7' }),
    )
  })
})

// Kurallar yayina alinmadan ONCE yazilmis kayitlar ne olacak?
// Bu testler goc riskini kayit altina alir: okuma ve silme her zaman
// calisir; DUZENLEME ise ancak kayit yeni semaya uyuyorsa calisir.
describe('eski bicimli kayitlar (goc riski)', () => {
  async function seedRaw(path: string, data: Record<string, unknown>) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), path), data)
    })
  }

  it('eksik alanli eski kayit OKUNABILIR', async () => {
    await seedRaw('transactions/eski', { date: '2025-01-05', category: 'Market (Ev)' })
    const db = testEnv.authenticatedContext(CAN_UID).firestore()
    await assertSucceeds(getDoc(doc(db, 'transactions/eski')))
  })

  it('eksik alanli eski kayit SILINEBILIR', async () => {
    await seedRaw('transactions/eski2', { date: '2025-01-05', category: 'Market (Ev)' })
    const db = testEnv.authenticatedContext(CAN_UID).firestore()
    await assertSucceeds(deleteDoc(doc(db, 'transactions/eski2')))
  })

  it('eksik alanli eski kayit DUZENLENEMEZ (kural reddeder)', async () => {
    await seedRaw('transactions/eski3', { date: '2025-01-05', category: 'Market (Ev)' })
    const db = testEnv.authenticatedContext(CAN_UID).firestore()
    await assertFails(updateDoc(doc(db, 'transactions/eski3'), { description: 'yeni' }))
  })

  it('duzenleme sirasinda eksik alanlar tamamlanirsa KABUL EDILIR', async () => {
    await seedRaw('transactions/eski4', { date: '2025-01-05', category: 'Market (Ev)' })
    const db = testEnv.authenticatedContext(CAN_UID).firestore()
    await assertSucceeds(
      updateDoc(doc(db, 'transactions/eski4'), {
        amount: 12.5,
        currency: 'EUR',
        account: 'Ortak Kasa',
      }),
    )
  })

  it('uygulamanin kendi yazdigi kayitlar yeni semaya zaten uyuyor', async () => {
    // Formlarin urettigi TransactionDraft'in birebir sekli.
    await seedRaw('transactions/normal', validTransaction)
    const db = testEnv.authenticatedContext(CAN_UID).firestore()
    await assertSucceeds(updateDoc(doc(db, 'transactions/normal'), { description: 'guncellendi' }))
  })
})

it('emulator baglantisi kuruldu', () => {
  expect(testEnv).toBeDefined()
})
