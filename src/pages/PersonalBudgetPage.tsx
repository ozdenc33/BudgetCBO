import { useMemo, useState } from 'react'
import { useToday } from '../hooks/useToday'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useIncomes } from '../hooks/useIncomes'
import { useTransfers } from '../hooks/useTransfers'
import { useRecurring } from '../hooks/useRecurring'
import { saveSettings } from '../lib/firestoreSettings'
import { computePersonalBudget } from '../domain/personalBudget'
import { personForEmail } from '../lib/currentPerson'
import { useAuth } from '../auth/AuthContext'
import type { Person, PersonalBudgetPlan } from '../domain/types'
import { todayMonthKey } from '../domain/dates'
import { useWrite } from '../hooks/useWrite'

const PERSONS: Person[] = ['Can', 'Tuğçe']

const UNASSIGNED_LABEL: Record<string, string> = {
  tamam: 'Sıfır bazlı plan tamam',
  dagitilmadi: 'Plan gelirin tamamı dağıtılmadı, tasarrufa veya kategoriye atayın',
  asildi: 'Plan gelirden fazla harcama planlanmış',
}

function fmt(value: number | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(value: number | undefined): string {
  if (value == null) return '—'
  return (value * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + '%'
}

export function PersonalBudgetPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { incomes, loading: incomesLoading } = useIncomes()
  const { transfers, loading: transfersLoading } = useTransfers()
  const { items: recurring, loading: recurringLoading } = useRecurring()
  const { user } = useAuth()
  const currentPerson = personForEmail(user?.email)
  const [person, setPerson] = useState<Person>(() => personForEmail(user?.email) ?? 'Can')
  const [month, setMonth] = useState(todayMonthKey)
  // Baskasinin butcesinde ilk degisiklikte bir kez onay istenir.
  const [otherPersonConfirmed, setOtherPersonConfirmed] = useState(false)

  const loading = settingsLoading || txLoading || incomesLoading || transfersLoading || recurringLoading
  const today = useToday()
  const runWrite = useWrite()

  const plan = settings.personalPlans[person]

  const budget = useMemo(
    () =>
      loading
        ? undefined
        : computePersonalBudget(person, month, plan, transactions, incomes, transfers, recurring, settings, today),
    [loading, person, month, plan, transactions, incomes, transfers, recurring, settings, today],
  )

  const editingOtherPerson = currentPerson != null && currentPerson !== person

  async function setPlan(next: PersonalBudgetPlan) {
    if (editingOtherPerson && !otherPersonConfirmed) {
      const ok = window.confirm(
        `${currentPerson} olarak giriş yaptın ama ${person} kişisinin bütçe planını değiştiriyorsun. Devam edilsin mi?`,
      )
      if (!ok) return
      setOtherPersonConfirmed(true)
    }
    await runWrite(
      saveSettings({
        ...settings,
        personalPlans: { ...settings.personalPlans, [person]: next },
      }),
      { failureMessage: 'Plan kaydedilemedi' },
    )
  }

  function selectPerson(next: Person) {
    setPerson(next)
    setOtherPersonConfirmed(false)
  }

  function setIncomePlanValue(source: string, value: number) {
    void setPlan({ ...plan, incomePlan: { ...plan.incomePlan, [source]: value } })
  }

  function setCategoryPlanValue(category: string, value: number) {
    void setPlan({ ...plan, categoryPlan: { ...plan.categoryPlan, [category]: value } })
  }

  if (loading || !budget) {
    return <div className="page-loading">Yükleniyor...</div>
  }

  return (
    <div className="personal-budget-page">
      <div className="expenses-list-header personal-budget-controls">
        <div className="person-toggle">
          {PERSONS.map((p) => (
            <button
              key={p}
              className={p === person ? 'person-toggle-btn person-toggle-btn--active' : 'person-toggle-btn'}
              onClick={() => selectPerson(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <label>
          Ay
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
      </div>

      {editingOtherPerson && (
        <p className="warn-note">
          {currentPerson} olarak giriş yaptın, {person} kişisinin bütçesini görüntülüyorsun. Plan
          değiştirirsen onay istenecek.
        </p>
      )}

      <section className="dashboard-section">
        <h2>1. Gelir</h2>
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Kaynak</th>
                <th>Planlanan</th>
                <th>Gerçekleşen</th>
                <th>Fark</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {budget.income.rows.map((row) => (
                <tr key={row.source}>
                  <td style={{ textAlign: 'left' }}>{row.source}</td>
                  <td>
                    <input
                      className="settings-list-inline-input"
                      type="number"
                      step="0.01"
                      key={`${person}-${row.plannedEUR}`}
                      defaultValue={row.plannedEUR}
                      onBlur={(e) => setIncomePlanValue(row.source, Number(e.target.value) || 0)}
                    />
                  </td>
                  <td>{fmt(row.actualEUR)} €</td>
                  <td className={row.diffEUR < 0 ? 'cell-negative' : ''}>{fmt(row.diffEUR)} €</td>
                  <td>{fmtPct(row.usagePct)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ textAlign: 'left' }}>
                  <strong>Toplam gelir</strong>
                </td>
                <td>{fmt(budget.income.plannedEUR)} €</td>
                <td>{fmt(budget.income.actualEUR)} €</td>
                <td className={budget.income.diffEUR < 0 ? 'cell-negative' : ''}>
                  {fmt(budget.income.diffEUR)} €
                </td>
                <td>{fmtPct(budget.income.usagePct)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>2. Ortak Harcamalardaki Payı</h2>
        <p className="settings-note">Ev, dışarı, Mike, taşınma harcamalarındaki payı.</p>
        <div className="summary-grid">
          <div className="summary-tile">
            <span className="summary-label">Planlanan</span>
            <input
              className="settings-list-inline-input"
              type="number"
              step="0.01"
              key={`${person}-${plan.sharedContributionPlanEUR}`}
              defaultValue={plan.sharedContributionPlanEUR}
              onBlur={(e) => setPlan({ ...plan, sharedContributionPlanEUR: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="summary-tile">
            <span className="summary-label">Gerçekleşen</span>
            <span className="summary-value">{fmt(budget.sharedContribution.actualEUR)} €</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Kalan</span>
            <span
              className={
                budget.sharedContribution.remainingEUR < 0
                  ? 'summary-value summary-value--negative'
                  : 'summary-value'
              }
            >
              {fmt(budget.sharedContribution.remainingEUR)} €
            </span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Öneri A: sabit giderin yarısı</span>
            <span className="summary-value">{fmt(budget.sharedContribution.suggestionHalfFixedEUR)} €</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Öneri B: kategori limitinin yarısı</span>
            <span className="summary-value">
              {fmt(budget.sharedContribution.suggestionHalfCategoryLimitEUR)} €
            </span>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>3. Kişisel Harcamalar</h2>
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Kategori</th>
                <th>Planlanan</th>
                <th>Gerçekleşen</th>
                <th>Kalan</th>
                <th>Kullanım</th>
              </tr>
            </thead>
            <tbody>
              {budget.personalCategories.rows.map((row) => (
                <tr key={row.category}>
                  <td style={{ textAlign: 'left' }}>{row.category}</td>
                  <td>
                    <input
                      className="settings-list-inline-input"
                      type="number"
                      step="0.01"
                      key={`${person}-${row.plannedEUR}`}
                      defaultValue={row.plannedEUR}
                      onBlur={(e) => setCategoryPlanValue(row.category, Number(e.target.value) || 0)}
                    />
                  </td>
                  <td>{fmt(row.actualEUR)} €</td>
                  <td className={(row.remainingEUR ?? 0) < 0 ? 'cell-negative' : ''}>
                    {row.remainingEUR != null ? fmt(row.remainingEUR) + ' €' : '—'}
                  </td>
                  <td>{fmtPct(row.usagePct)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ textAlign: 'left' }}>
                  <strong>Toplam kişisel</strong>
                </td>
                <td>{fmt(budget.personalCategories.plannedEUR)} €</td>
                <td>{fmt(budget.personalCategories.actualEUR)} €</td>
                <td className={budget.personalCategories.remainingEUR < 0 ? 'cell-negative' : ''}>
                  {fmt(budget.personalCategories.remainingEUR)} €
                </td>
                <td>{fmtPct(budget.personalCategories.usagePct)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="settings-note">
          Kişisel sabit giderler (aylık eşdeğer): {fmt(budget.personalFixedMonthlyEquivalentEUR)} €
        </p>
      </section>

      <section className="dashboard-section">
        <h2>4. Tasarruf</h2>
        <div className="summary-grid">
          <div className="summary-tile">
            <span className="summary-label">Planlanan</span>
            <input
              className="settings-list-inline-input"
              type="number"
              step="0.01"
              key={`${person}-${plan.savingsPlanEUR}`}
              defaultValue={plan.savingsPlanEUR}
              onBlur={(e) => setPlan({ ...plan, savingsPlanEUR: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="summary-tile">
            <span className="summary-label">Hedeflere aktarılan</span>
            <span className="summary-value">{fmt(budget.savings.actualEUR)} €</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Fark</span>
            <span
              className={
                budget.savings.diffEUR < 0 ? 'summary-value summary-value--negative' : 'summary-value'
              }
            >
              {fmt(budget.savings.diffEUR)} €
            </span>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>5. Sonuç</h2>
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}></th>
                <th>Plan</th>
                <th>Gerçekleşen</th>
                <th>Fark</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'left' }}>Gelir</td>
                <td>{fmt(budget.income.plannedEUR)} €</td>
                <td>{fmt(budget.income.actualEUR)} €</td>
                <td>{fmt(budget.summary.incomeDiffEUR)} €</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>Ortak payı</td>
                <td>{fmt(budget.sharedContribution.plannedEUR)} €</td>
                <td>{fmt(budget.sharedContribution.actualEUR)} €</td>
                <td>{fmt(budget.summary.sharedContributionDiffEUR)} €</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>Kişisel harcama</td>
                <td>{fmt(budget.personalCategories.plannedEUR)} €</td>
                <td>{fmt(budget.personalCategories.actualEUR)} €</td>
                <td>{fmt(budget.summary.personalCategoriesDiffEUR)} €</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>Tasarruf</td>
                <td>{fmt(budget.savings.plannedEUR)} €</td>
                <td>{fmt(budget.savings.actualEUR)} €</td>
                <td>{fmt(budget.summary.savingsDiffEUR)} €</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>
                  <strong>Net</strong>
                </td>
                <td>{fmt(budget.summary.netPlannedEUR)} €</td>
                <td className={budget.summary.netActualEUR < 0 ? 'cell-negative' : ''}>
                  {fmt(budget.summary.netActualEUR)} €
                </td>
                <td>{fmt(budget.summary.netDiffEUR)} €</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="summary-grid">
          <div className="summary-tile">
            <span className="summary-label">Atanmamış para</span>
            <span className="summary-value">{UNASSIGNED_LABEL[budget.unassignedStatus]}</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Bu ay harcanabilir kalan</span>
            <span className="summary-value">{fmt(budget.spendableThisMonthEUR)} €</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Günlük harcanabilir</span>
            <span className="summary-value">{fmt(budget.dailySpendableEUR)} €</span>
          </div>
          <div className="summary-tile">
            <span className="summary-label">Tasarruf oranı</span>
            <span className="summary-value">{fmtPct(budget.savingsRatePct)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
