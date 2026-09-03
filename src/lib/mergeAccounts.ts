import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

const BATCH_SIZE = 450

export type MergeAccountsCounts = {
  transactions: number
  incomes: number
  transfers: number
  recurring: number
  total: number
}

/**
 * Bir hesabin adini gecen TUM tarihsel kayitlarda baska bir hesabin
 * adiyla degistirir. Kayitlar HESAP ADINA gore baglandigi icin (id'ye
 * degil), iki hesabi "birlestirmenin" tek dogru yolu budur — aksi
 * halde eski kayitlar artik var olmayan bir hesap adina isaret edip
 * bakiye hesaplarinda kaybolur.
 *
 * Kullanim ornegi: Can-TR Banka ve Can-DE Girokonto'yu tek hesapta
 * birlestirmek — ikisi de zaten her para birimini kabul edebiliyor
 * (bkz. src/domain/rate.ts), asil eksik olan gecmis kayitlarin tasinmasi.
 *
 * `settings.accounts`'tan kaynak hesabi SILMEK cagiranin sorumlulugundadir
 * (bu fonksiyon yalnizca kayitlari tasir).
 */
export async function mergeAccounts(
  sourceAccountName: string,
  targetAccountName: string,
): Promise<MergeAccountsCounts> {
  const counts: MergeAccountsCounts = {
    transactions: 0,
    incomes: 0,
    transfers: 0,
    recurring: 0,
    total: 0,
  }

  async function renameField(collectionName: string, field: string, onCount: (n: number) => void) {
    const snap = await getDocs(
      query(collection(db, collectionName), where(field, '==', sourceAccountName)),
    )
    const docs = snap.docs
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db)
      for (const d of docs.slice(i, i + BATCH_SIZE)) {
        batch.update(d.ref, { [field]: targetAccountName })
      }
      await batch.commit()
    }
    onCount(docs.length)
  }

  // transactions.account VE transactions.secondAccount ayri ayri
  // taranir (bir kaydin ikisi de kaynak hesaba esit olmasi teorik
  // olarak mumkun ama pratikte olmaz; iki tarama da guvenlidir).
  await renameField('transactions', 'account', (n) => (counts.transactions += n))
  await renameField('transactions', 'secondAccount', (n) => (counts.transactions += n))
  await renameField('incomes', 'account', (n) => (counts.incomes += n))
  await renameField('transfers', 'fromAccount', (n) => (counts.transfers += n))
  await renameField('transfers', 'toAccount', (n) => (counts.transfers += n))
  await renameField('recurring', 'account', (n) => (counts.recurring += n))

  counts.total = counts.transactions + counts.incomes + counts.transfers + counts.recurring
  return counts
}

/** Bir hesap adinin kac kayitta gectigini SAYAR, hicbir seyi degistirmez (onizleme icin). */
export async function countAccountReferences(accountName: string): Promise<MergeAccountsCounts> {
  const counts: MergeAccountsCounts = {
    transactions: 0,
    incomes: 0,
    transfers: 0,
    recurring: 0,
    total: 0,
  }

  async function countField(collectionName: string, field: string): Promise<number> {
    const snap = await getDocs(
      query(collection(db, collectionName), where(field, '==', accountName)),
    )
    return snap.size
  }

  counts.transactions =
    (await countField('transactions', 'account')) +
    (await countField('transactions', 'secondAccount'))
  counts.incomes = await countField('incomes', 'account')
  counts.transfers =
    (await countField('transfers', 'fromAccount')) + (await countField('transfers', 'toAccount'))
  counts.recurring = await countField('recurring', 'account')
  counts.total = counts.transactions + counts.incomes + counts.transfers + counts.recurring
  return counts
}
