import type { Account, AccountBalance } from '../domain/types'

// Hesap secerken o an canlı bakiyeyi de gostermek icin: harcama ve
// hızlı giris formlarindaki hesap <select>'lerinin ortak <option>
// listesi. Yanlis hesaptan cekmeyi (orn. bakiyesi yetersiz hesabi
// secmeyi) kaydetmeden once fark ettirir.
function fmt(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function accountOptionLabel(account: Account, balances: AccountBalance[]): string {
  const balance = balances.find((b) => b.account.name === account.name)?.balanceEUR
  return balance == null ? account.name : `${account.name} · ${fmt(balance)} €`
}

export function AccountOptions({
  accounts,
  balances,
}: {
  accounts: Account[]
  balances: AccountBalance[]
}) {
  return (
    <>
      {accounts.map((a) => (
        <option key={a.id} value={a.name}>
          {accountOptionLabel(a, balances)}
        </option>
      ))}
    </>
  )
}
