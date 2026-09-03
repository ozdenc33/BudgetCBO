import { useState, type ChangeEvent } from 'react'
import { useToday } from '../hooks/useToday'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import { useIncomes } from '../hooks/useIncomes'
import { useTransfers } from '../hooks/useTransfers'
import { useRecurring } from '../hooks/useRecurring'
import { useGoals } from '../hooks/useGoals'
import type { ImportResult } from '../domain/excelImport'
import { bulkImport } from '../lib/firestoreImport'
import { todayISO } from '../domain/dates'
import { firestoreErrorMessage } from '../domain/firestoreErrors'

// exceljs agir bir kutuphane (~1.7MB); mobil-oncelikli ana paketi
// sismemesi icin yalnizca bu sayfa kullanildiginda dinamik olarak
// yuklenir (ayri bir Vite chunk'ina boler).

export function ImportExportPage() {
  const { settings, loading: settingsLoading } = useSettings()
  const { transactions, loading: txLoading } = useTransactions()
  const { incomes, loading: incomesLoading } = useIncomes()
  const { transfers, loading: transfersLoading } = useTransfers()
  const { items: recurring, loading: recurringLoading } = useRecurring()
  const { goals, loading: goalsLoading } = useGoals()

  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importLog, setImportLog] = useState<string | null>(null)

  const loading =
    settingsLoading || txLoading || incomesLoading || transfersLoading || recurringLoading || goalsLoading
  const today = useToday()

  async function handleExport() {
    setExporting(true)
    try {
      const { exportWorkbook, downloadBlob } = await import('../domain/excelExport')
      const blob = await exportWorkbook({ transactions, incomes, transfers, recurring, goals, settings, today })
      downloadBlob(blob, `budgetcbo-yedek-${todayISO()}.xlsx`)
    } catch (err) {
      console.error('Disa aktarma basarisiz', err)
      setImportLog(
        `Yedek oluşturulamadı: ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setExporting(false)
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLog(null)
    setImportResult(null)
    setParsing(true)
    try {
      const { parseWorkbookFile } = await import('../domain/excelImport')
      const result = await parseWorkbookFile(file)
      setImportResult(result)
    } catch (err) {
      setImportLog(`Dosya okunamadı: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setParsing(false)
      e.target.value = ''
    }
  }

  async function handleConfirmImport() {
    if (!importResult) return
    if (
      !window.confirm(
        'Bu içe aktarma, dosyadaki tüm satırları yeni kayıtlar olarak ekleyecek. Daha önce içe aktardıysanız kayıtlar tekrarlanır. Devam edilsin mi?',
      )
    ) {
      return
    }
    setImporting(true)
    try {
      // Toplu yazma commitWrite'tan gecirilmez: yarim kalmis bir ice
      // aktarmayi "kaydedildi" gibi gostermek yanlis olur, kullanicinin
      // gercekten kac satirin gectigini gormesi gerekir.
      const counts = await bulkImport(importResult)
      setImportLog(
        `İçe aktarıldı: ${counts.transactions} harcama, ${counts.incomes} gelir, ${counts.transfers} transfer, ${counts.recurring} sabit gider, ${counts.goals} hedef.`,
      )
      setImportResult(null)
    } catch (err) {
      console.error('Ice aktarma basarisiz', err)
      setImportLog(`İçe aktarma tamamlanamadı: ${firestoreErrorMessage(err)}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="import-export-page">
      <section className="dashboard-section">
        <h2>Dışa Aktar (yedek)</h2>
        <p className="settings-note">
          Tüm harcama, gelir, transfer, sabit gider ve hedef verilerini tek bir Excel dosyasına
          indirir. Aylık yedek olarak saklamanız önerilir.
        </p>
        <div className="import-export-actions">
          <button onClick={handleExport} disabled={loading || exporting}>
            {exporting ? 'Hazırlanıyor...' : 'Excel olarak indir'}
          </button>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>İçe Aktar</h2>
        <p className="settings-note">
          Ortak_Butce_v9.xlsx dosyasını (veya aynı sayfa/kolon düzenindeki bir dosyayı) seçin.
          Islemler, Gelirler, Transferler, Sabit_Giderler ve Hedefler sayfaları okunur; Ayarlar
          sayfası okunmaz (kategoriler, hesaplar ve kurlar zaten uygulamada tanımlı, Ayarlar
          ekranından düzenlenir). Bu işlem tek seferliktir — aynı dosyayı iki kez içe aktarırsanız
          kayıtlar tekrarlanır.
        </p>
        <input type="file" accept=".xlsx" onChange={handleFileChange} disabled={parsing || importing} />

        {parsing && <p>Dosya okunuyor...</p>}

        {importResult && (
          <>
            <ul className="import-preview-list">
              <li>
                <span>Harcamalar</span>
                <span>{importResult.transactions.length}</span>
              </li>
              <li>
                <span>Gelirler</span>
                <span>{importResult.incomes.length}</span>
              </li>
              <li>
                <span>Transferler</span>
                <span>{importResult.transfers.length}</span>
              </li>
              <li>
                <span>Sabit giderler</span>
                <span>{importResult.recurring.length}</span>
              </li>
              <li>
                <span>Hedefler</span>
                <span>{importResult.goals.length}</span>
              </li>
            </ul>
            {importResult.warnings.length > 0 && (
              <div className="import-log">{importResult.warnings.join('\n')}</div>
            )}
            <div className="import-export-actions">
              <button onClick={handleConfirmImport} disabled={importing}>
                {importing ? 'Aktarılıyor...' : 'Onayla ve içe aktar'}
              </button>
              <button type="button" onClick={() => setImportResult(null)} disabled={importing}>
                İptal
              </button>
            </div>
          </>
        )}

        {importLog && <div className="import-log">{importLog}</div>}
      </section>
    </div>
  )
}
