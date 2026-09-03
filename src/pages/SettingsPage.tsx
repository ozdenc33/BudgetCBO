import { useEffect, useState, type FormEvent } from 'react'
import { useSettings } from '../hooks/useSettings'
import { saveSettings } from '../lib/firestoreSettings'
import { useWrite } from '../hooks/useWrite'
import { fetchEurTryRate } from '../lib/fetchRate'
import { countAccountReferences, mergeAccounts } from '../lib/mergeAccounts'
import { todayMonthKey } from '../domain/dates'
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
  const runWrite = useWrite()

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  async function persist(next: Settings) {
    setDraft(next)
    const ok = await runWrite(saveSettings(next), { failureMessage: 'Ayarlar kaydedilemedi' })
    // Yazma reddedildiyse ekrandaki taslak gercekle uyusmuyor demektir;
    // en son bilinen kayitli ayarlara geri don.
    if (!ok) setDraft(settings)
  }

  if (loading) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  return (
    <div className="settings-page">
      <AccountsSection draft={draft} onSave={persist} />
      <AccountMergeSection draft={draft} onSave={persist} />
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
    }
    onSave({ ...draft, accounts: [...draft.accounts, account] })
    setName('')
  }

  function removeAccount(id: string) {
    onSave({ ...draft, accounts: draft.accounts.filter((a) => a.id !== id) })
  }

  return (
    <section className="settings-section">
      <h2>Hesaplar</h2>
      <ul className="settings-list">
        {draft.accounts.map((a) => (
          <li key={a.id}>
            <span className="settings-row-main">
              <span className="settings-row-name">{a.name}</span>
              <span className="settings-list-meta">
                {a.currency} · {a.owner}
              </span>
            </span>
            <button onClick={() => removeAccount(a.id)} aria-label={`${a.name} sil`}>
              Sil
            </button>
          </li>
        ))}
      </ul>
      <p className="settings-note">
        Bir hesabın açılış bakiyesini Gelirler sayfasından, uygulamayı kullanmaya başladığın
        tarihten önceki bir günle gelir olarak gir.
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

/**
 * Iki hesabi birlestirir: kaynagin TUM tarihsel kayitlari (harcama,
 * gelir, transfer, sabit gider) hedef hesabin adina tasinir, sonra
 * kaynak hesap listeden silinir. NEDEN: hesaplar sadece AD ile
 * baglaniyor (bkz. src/lib/mergeAccounts.ts) — hesabi listeden
 * silmek tek basina gecmis kayitlari "yetim" birakirdi.
 *
 * Ornek kullanim: Can-TR Banka ve Can-DE Girokonto'yu tek hesapta
 * birlestirmek (ikisi de zaten TL/EUR karisik kabul edebiliyor).
 */
function AccountMergeSection({ draft, onSave }: SectionProps) {
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [preview, setPreview] = useState<{ total: number } | null>(null)
  const [checking, setChecking] = useState(false)
  const [merging, setMerging] = useState(false)
  const [resultNote, setResultNote] = useState<string | null>(null)

  if (draft.accounts.length < 2) return null

  async function handlePreview() {
    if (!source || !target || source === target) return
    setChecking(true)
    setResultNote(null)
    try {
      const counts = await countAccountReferences(source)
      setPreview({ total: counts.total })
    } catch (err) {
      setResultNote(`Önizleme alınamadı: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setChecking(false)
    }
  }

  async function handleMerge() {
    if (!source || !target || source === target) return
    if (
      !window.confirm(
        `"${source}" hesabındaki tüm geçmiş kayıtlar (yaklaşık ${preview?.total ?? '?'} adet) "${target}" hesabına taşınacak, sonra "${source}" hesap listesinden silinecek. Bu işlem geri alınamaz. Devam edilsin mi?`,
      )
    ) {
      return
    }
    setMerging(true)
    setResultNote(null)
    try {
      const counts = await mergeAccounts(source, target)
      onSave({ ...draft, accounts: draft.accounts.filter((a) => a.name !== source) })
      setResultNote(
        `Birleştirildi: ${counts.total} kayıt (${counts.transactions} harcama, ${counts.incomes} gelir, ${counts.transfers} transfer, ${counts.recurring} sabit gider) "${target}" hesabına taşındı.`,
      )
      setSource('')
      setTarget('')
      setPreview(null)
    } catch (err) {
      setResultNote(`Birleştirme başarısız: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setMerging(false)
    }
  }

  return (
    <section className="settings-section">
      <h2>Hesapları Birleştir</h2>
      <p className="settings-note">
        İki ayrı hesabı (örn. TR ve DE hesabı) tek hesapta toplar. Her hesap zaten hem EUR hem TL
        kaydı tutabiliyor; bu araç yalnızca geçmiş kayıtları taşır ve kaynak hesabı listeden
        kaldırır — geri alınamaz.
      </p>
      <div className="settings-add-form">
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
            setPreview(null)
          }}
        >
          <option value="">Kaynak hesap (silinecek)</option>
          {draft.accounts.map((a) => (
            <option key={a.id} value={a.name} disabled={a.name === target}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={target}
          onChange={(e) => {
            setTarget(e.target.value)
            setPreview(null)
          }}
        >
          <option value="">Hedef hesap (kalacak)</option>
          {draft.accounts.map((a) => (
            <option key={a.id} value={a.name} disabled={a.name === source}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {source && target && (
        <div className="settings-inline-actions">
          {preview == null ? (
            <button type="button" onClick={handlePreview} disabled={checking}>
              {checking ? 'Kontrol ediliyor...' : 'Önce kaç kayıt etkileneceğini göster'}
            </button>
          ) : (
            <button type="button" onClick={handleMerge} disabled={merging}>
              {merging
                ? 'Birleştiriliyor...'
                : `${preview.total} kaydı "${target}" hesabına taşı ve "${source}"yi sil`}
            </button>
          )}
        </div>
      )}
      {resultNote && <p className="settings-note">{resultNote}</p>}
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
      categories: draft.categories.map((c) => (c.id === id ? { ...c, monthlyLimitEUR: value } : c)),
    })
  }

  const LIMIT_ELIGIBLE: CategoryBudgetType[] = ['Ortak-Ev', 'Ortak-Dışarı', 'Mike']

  return (
    <section className="settings-section">
      <h2>Kategoriler</h2>
      <ul className="settings-list settings-list--scroll">
        {draft.categories.map((c) => (
          <li key={c.id}>
            <span className="settings-row-main">
              <span className="settings-row-name">{c.name}</span>
              <span className="settings-list-meta">{c.budgetType}</span>
            </span>
            {LIMIT_ELIGIBLE.includes(c.budgetType) && (
              <label className="settings-field">
                <span className="settings-field-label">Aylık limit €</span>
                <input
                  className="settings-list-inline-input"
                  type="number"
                  step="0.01"
                  key={c.monthlyLimitEUR ?? 0}
                  defaultValue={c.monthlyLimitEUR ?? 0}
                  onBlur={(e) => setCategoryLimit(c.id, Number(e.target.value) || 0)}
                />
              </label>
            )}
            <button onClick={() => removeCategory(c.id)} aria-label={`${c.name} sil`}>
              Sil
            </button>
          </li>
        ))}
      </ul>
      <p className="settings-note">
        Aylık limit yalnızca Ortak-Ev, Ortak-Dışarı ve Mike kategorilerinde girilir; Ay Panosu'ndaki
        "Limit / Kalan / Kullanım" kolonlarında kullanılır. Kişisel harcamalar için plan, Kişisel
        Bütçe sayfasından girilir.
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
  const [fetching, setFetching] = useState(false)
  const [fetchNote, setFetchNote] = useState<string | null>(null)

  /**
   * Guncel kuru getirip formu DOLDURUR, kaydetmez. Kullanici degeri
   * gorup "Ekle" derse kaydedilir — otomatik yazma bilerek yok, cunku
   * kur bu uygulamada gecmise donuk hesaplari da etkiliyor.
   */
  async function suggestCurrentRate() {
    setFetching(true)
    setFetchNote(null)
    try {
      const { rate: fetched, date } = await fetchEurTryRate()
      setMonthKey((current) => current || todayMonthKey())
      setRate(String(fetched))
      setFetchNote(
        `Avrupa Merkez Bankası kuru${date ? ` (${date})` : ''}: 1 EUR = ${fetched} TRY. Kaydetmek için "Ekle" deyin.`,
      )
    } catch (err) {
      console.error('Kur getirilemedi', err)
      setFetchNote(
        `Kur getirilemedi (${err instanceof Error ? err.message : String(err)}). Elle girebilirsiniz.`,
      )
    } finally {
      setFetching(false)
    }
  }

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
      <label className="settings-inline-field">
        Makas farkı (%)
        <input
          type="number"
          step="0.1"
          min="0"
          defaultValue={draft.fxSpreadPct ?? 0}
          onBlur={(e) => {
            const value = Number(e.target.value)
            if (value >= 0) onSave({ ...draft, fxSpreadPct: value })
          }}
        />
      </label>
      <p className="settings-note">
        Gerçek banka/döviz işlemlerinde alış-satış kuru arasında her zaman bir fark vardır. Bu oran
        girilirse: TL{'→'}EUR gelirlerde kur biraz yüksekten (daha az EUR), TL{'→'}
        EUR giderlerde kur biraz düşükten (daha çok EUR, yani gerçek maliyet) hesaplanır. 0 = makas
        yok (varsayılan).
      </p>
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
      <div className="settings-inline-actions">
        <button type="button" onClick={suggestCurrentRate} disabled={fetching}>
          {fetching ? 'Getiriliyor...' : 'Güncel kuru getir'}
        </button>
      </div>
      {fetchNote && <p className="settings-note">{fetchNote}</p>}
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
        hesaplanır.
      </p>
    </section>
  )
}
