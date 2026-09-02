import type { ComputedTransfer, Settings, Transfer } from './types'
import { monthKeyOf, resolveRate } from './rate'

// Transferler sayfasindaki gri kolonlarin birebir karsiligidir: Ay (B),
// Kur (H), Tutar EUR (I), Kontrol (M). Transfer harcama sayilmaz, hicbir
// harcama toplamina girmez.

const NON_GOAL_RECIPIENTS = ['Can', 'Tuğçe', 'Ortak Kasa']

function validate(transfer: Transfer): string {
  if (!transfer.date) return ''
  if (!transfer.type || !transfer.from || !transfer.to || transfer.amount == null) {
    return 'Eksik alan'
  }
  if (transfer.type === 'Ortak Kasa Katkısı' && transfer.to !== 'Ortak Kasa') {
    return 'Alıcı Ortak Kasa olmalı'
  }
  if (
    transfer.type === 'Kişiden Kişiye' &&
    (transfer.to === 'Ortak Kasa' || transfer.to === transfer.from)
  ) {
    return 'Alıcı diğer kişi olmalı'
  }
  if (transfer.type === 'Tasarruf' && NON_GOAL_RECIPIENTS.includes(transfer.to)) {
    return 'Alıcı bir hedef olmalı'
  }
  return 'OK'
}

export function computeTransfer(transfer: Transfer, settings: Settings): ComputedTransfer {
  const monthKey = transfer.date ? monthKeyOf(transfer.date) : ''
  const { rate, rateSource } = resolveRate(transfer.currency, monthKey, settings)
  const amountEUR = transfer.amount != null ? transfer.amount / rate : undefined
  const validation = validate(transfer)

  return {
    ...transfer,
    monthKey,
    rate,
    rateSource,
    amountEUR,
    validation,
  }
}
