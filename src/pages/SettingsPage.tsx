import { useEffect, useState, type FormEvent } from 'react'
import { useSettings } from '../hooks/useSettings'
import { saveSettings } from '../lib/firestoreSettings'
import type {
  Account,
  AccountOwner,
  Category,
  CategoryBudgetType,
  Currency,
  IncomeSource,
  Settings,
} from '../domain/types'

const CURRENCIES: Currency[] = ['EUR', 'TRY']
const OWNERS: AccountOwner[] = ['Can', 'Tuğçe', 'Ortak Kasa']
const CATEGORY_TYPES: CategoryBudgetType[] = [
  'Ortak-Ev',
  'Ortak-Dışarı',
  'Mike',
  'Kişisel',
  'Taşınma',
]

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `id-${Date.now()}`
  )
}

export function SettingsPage() {
  const { settings, loading } = useSettings()
  const [draft, setDraft] = useState<Settings>(settings)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  async function persist(next: Settings) {
    setDraft(next)
    await saveSettings(next)
  }

  if (loading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  return (
    <div className="settings-page">
      <AccountsSection draft={draft} onSave={persist} />
      <CategoriesSection draft={draft} onSave={persist} />
      <IncomeSourcesSection draft={draft} onSave={persist} />
      <RatesSection draft={draft} onSave={persist} />
      <SperrkontoSection draft={draft} onSave={persist} />
    </div>
  )
}

type SectionProps = {
  draft: Settings
  onSave: (next: Settings) => void
}

function AccountsSection({ draft, onSave }: SectionProps) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [owner, setOwner] = useState<AccountOwner>('Can')

  function addAccount(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const account: Account = {
      id: slugify(name),
      name: name.trim(),
      currency,
      owner,
      startingBalanceEUR: 0,
    }
    onSave({ ...draft, accounts: [...draft.accounts, account] })
    setName('')
  }

  function removeAccount(id: string) {
    onSave({ ...draft, accounts: draft.accounts.filter((a) => a.id !== id) })
  }

  function setStartingBalance(id: string, value: number) {
    onSave({
      ...draft,
      accounts: draft.accounts.map((a) =>
        a.id === id ? { ...a, startingBalanceEUR: value } : a,
      ),
    })
  }

  return (
    <section className="settings-section">
      <h2>Hesaplar</h2>
      <ul className="settings-list">
        {draft.accounts.map((a) => (
          <li key={a.id}>
            <span>{a.name}</span>
            <span className="settings-list-meta">
              {a.currency} · {a.owner}
            </span>
            <input
              className="settings-list-inline-input"
              type="number"
              step="0.01"
              aria-label={`${a.name} başlangıç bakiyesi`}
              defaultValue={a.startingBalanceEUR}
              onBlur={(e) => setStartingBalance(a.id, Number(e.target.value) || 0)}
            />
            <button onClick={() => removeAccount(a.id)} aria-label={`${a.name} sil`}>
              Sil
            </button>
          </li>
        ))}
      </ul>
      <p className="settings-note">
        Başlangıç bakiyesi (EUR): uygulamayı kullanmaya başlamadan önceki hesap bakiyesi.
      </p>
      <form className="settings-add-form" onSubmit={addAccount}>
        <input
          placeholder="Yeni hesap adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value as AccountOwner)}>
          {OWNERS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <button type="submit">Ekle</button>
      </form>
    </section>
  )
}

function CategoriesSection({ draft, onSave }: SectionProps) {
  const [name, setName] = useState('')
  const [budgetType, setBudgetType] = useState<CategoryBudgetType>('Ortak-Ev')

  function addCategory(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const category: Category = { id: slugify(name), name: name.trim(), budgetType }
    onSave({ ...draft, categories: [...draft.categories, category] })
    setName('')
  }

  function removeCategory(id: string) {
    onSave({ ...draft, categories: draft.categories.filter((c) => c.id !== id) })
  }

  function setCategoryLimit(id: string, value: number) {
    onSave({
      ...draft,
      categories: draft.categories.map((c) =>
        c.id === id ? { ...c, monthlyLimitEUR: value } : c,
      ),
    })
  }

  const LIMIT_ELIGIBLE: CategoryBudgetType[] = ['Ortak-Ev', 'Ortak-Dışarı', 'Mike']

  return (
    <section className="settings-section">
      <h2>Kategoriler</h2>
      <ul className="settings-list settings-list--scroll">
        {draft.categories.map((c) => (
          <li key={c.id}>
            <span>{c.name}</span>
            <span className="settings-list-meta">{c.budgetType}</span>
            {LIMIT_ELIGIBLE.includes(c.budgetType) && (
              <input
                className="settings-list-inline-input"
                type="number"
                step="0.01"
                aria-label={`${c.name} aylık limit`}
                defaultValue={c.monthlyLimitEUR ?? 0}
                onBlur={(e) => setCategoryLimit(c.id, Number(e.target.value) || 0)}
              />
            )}
            <button onClick={() => removeCategory(c.id)} aria-label={`${c.name} sil`}>
              Sil
            </button>
          </li>
        ))}
      </ul>
      <p className="settings-note">
        Limit (EUR): yalnızca Ortak-Ev/Ortak-Dışarı/Mike kategorilerinde anlamlıdır, aya göre
        değişmez. Kişisel limitler Faz 6'da eklenecek.
      </p>
      <form className="settings-add-form" onSubmit={addCategory}>
        <input
          placeholder="Yeni kategori adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          value={budgetType}
          onChange={(e) => setBudgetType(e.target.value as CategoryBudgetType)}
        >
          {CATEGORY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="submit">Ekle</button>
      </form>
    </section>
  )
}

function IncomeSourcesSection({ draft, onSave }: SectionProps) {
  const [name, setName] = useState('')

  function addSource(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const source: IncomeSource = { id: slugify(name), name: name.trim(), active: true }
    onSave({ ...draft, incomeSources: [...draft.incomeSources, source] })
    setName('')
  }

  function toggleActive(id: string) {
    onSave({
      ...draft,
      incomeSources: draft.incomeSources.map((s) =>
        s.id === id ? { ...s, active: !s.active } : s,
      ),
    })
  }

  function removeSource(id: string) {
    onSave({ ...draft, incomeSources: draft.incomeSources.filter((s) => s.id !== id) })
  }

  return (
    <section className="settings-section">
      <h2>Gelir Kaynakları</h2>
      <ul className="settings-list">
        {draft.incomeSources.map((s) => (
          <li key={s.id}>
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={s.active} onChange={() => toggleActive(s.id)} />
              {s.name}
            </label>
            <span className="settings-list-meta">{s.active ? 'Aktif' : 'Pasif'}</span>
            <button onClick={() => removeSource(s.id)} aria-label={`${s.name} sil`}>
              Sil
            </button>
          </li>
        ))}
      </ul>
      <form className="settings-add-form" onSubmit={addSource}>
        <input
          placeholder="Yeni gelir kaynağı"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">Ekle</button>
      </form>
    </section>
  )
}

function RatesSection({ draft, onSave }: SectionProps) {
  const [monthKey, setMonthKey] = useState('')
  const [rate, setRate] = useState('')

  function addRate(e: FormEvent) {
    e.preventDefault()
    const value = Number(rate)
    if (!monthKey || !value) return
    onSave({ ...draft, rates: { ...draft.rates, [monthKey]: value } })
    setMonthKey('')
    setRate('')
  }

  function removeRate(key: string) {
    const rates = { ...draft.rates }
    delete rates[key]
    onSave({ ...draft, rates })
  }

  return (
    <section className="settings-section">
      <h2>Kur (1 EUR = ? TRY)</h2>
      <label className="settings-inline-field">
        Varsayılan kur
        <input
          type="number"
          step="0.01"
          defaultValue={draft.defaultRate}
          onBlur={(e) => {
            const value = Number(e.target.value)
            if (value > 0) onSave({ ...draft, defaultRate: value })
          }}
        />
      </label>
      <ul className="settings-list">
        {Object.entries(draft.rates)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => (
            <li key={key}>
              <span>{key}</span>
              <span className="settings-list-meta">{value}</span>
              <button onClick={() => removeRate(key)} aria-label={`${key} kurunu sil`}>
                Sil
              </button>
            </li>
          ))}
      </ul>
      <form className="settings-add-form" onSubmit={addRate}>
        <input
          placeholder="YYYY-AA"
          pattern="\d{4}-\d{2}"
          value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}
        />
        <input
          placeholder="Kur"
          type="number"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <button type="submit">Ekle</button>
      </form>
    </section>
  )
}

function SperrkontoSection({ draft, onSave }: SectionProps) {
  return (
    <section className="settings-section">
      <h2>Sperrkonto</h2>
      <label className="settings-inline-field">
        Toplam bloke tutar (EUR)
        <input
          type="number"
          step="0.01"
          defaultValue={draft.sperrkonto.totalEUR ?? ''}
          onBlur={(e) => {
            const raw = e.target.value
            onSave({
              ...draft,
              sperrkonto: { ...draft.sperrkonto, totalEUR: raw === '' ? null : Number(raw) },
            })
          }}
        />
      </label>
      <label className="settings-inline-field">
        Aylık serbest tutar (EUR)
        <input
          type="number"
          step="0.01"
          defaultValue={draft.sperrkonto.monthlyReleaseEUR ?? ''}
          onBlur={(e) => {
            const raw = e.target.value
            onSave({
              ...draft,
              sperrkonto: {
                ...draft.sperrkonto,
                monthlyReleaseEUR: raw === '' ? null : Number(raw),
              },
            })
          }}
        />
      </label>
      <p className="settings-note">
        Toplam çekilen ve kalan bakiye, Gelirler sayfasındaki Sperrkonto kayıtlarından otomatik
        hesaplanacak (Faz 3).
      </p>
    </section>
  )
}
