'use client'
import { useState, use, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ownerApi } from '@/lib/api'
import { getErrorMessage, formatPrice } from '@/lib/utils'
import { Card, CardBody, Modal, EmptyState, Spinner } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, QrCode, RefreshCw, Trash2, Pencil, Check, X, Printer, Lock, LockOpen, Shield, ShieldOff, FileDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { QRCodeCanvas } from 'qrcode.react'
import { cn } from '@/lib/utils'
import type { TableItem, TableOverviewResponse, Order } from '@/types'

// ─── Print HTML builder ─────────────────────────────────────
function buildPrintHtml(
  tables: TableItem[],
  qrImages: Record<number, string>,
  restaurantName: string,
  showTableNumber: boolean,
  logoUrl: string
): string {
  const cards = tables.map(t => `
    <div class="card">
      <div class="header">
        <div class="brand-name">${restaurantName}</div>
        <div class="divider"></div>
      </div>

      <div class="qr-section">
        <div class="qr-container">
          <img src="${qrImages[t.id] ?? ''}" class="qr-img" alt="QR Kod">
        </div>
        <div class="scan-label">SİPARİŞ İÇİN OKUTUNUZ</div>
        <div class="scan-sublabel">Telefon kameranızla okutun</div>
      </div>

      ${showTableNumber ? `
      <div class="table-section">
        <div class="table-badge">
          <div class="table-label">MASA</div>
          <div class="table-num">${t.tableNumber}</div>
        </div>
      </div>` : ''}

      <div class="footer">
        ${logoUrl ? `<img src="${logoUrl}" class="footer-logo-img" alt="Logo">` : '<div class="footer-logo text-black">Viamean</div>'}
        <div class="footer-phone">+90 555 032 34 22</div>
      </div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>QR Kartlar</title>
<style>
  @page {
    size: 105mm 148mm;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background: #faf8f5;
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .card {
    width: 105mm;
    height: 148mm;
    position: relative;
    padding: 10mm 8mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .card:last-child { page-break-after: auto; break-after: auto; }

  .header {
    text-align: center;
    margin-bottom: 6mm;
  }
  .brand-name {
    font-size: 7.5mm;
    font-weight: 900;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.5mm;
    margin-bottom: 2mm;
    line-height: 1.1;
  }
  .divider {
    width: 15mm;
    height: 0.8mm;
    background-color: #c5a880;
    margin: 0 auto;
  }

  .qr-section {
    text-align: center;
    margin-bottom: 4mm;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .qr-container {
    display: inline-block;
    position: relative;
    padding: 4mm;
    background: #ffffff;
    border-radius: 6mm;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    margin-bottom: 4mm;
  }
  .qr-container::before, .qr-container::after {
    content: "";
    position: absolute;
    width: 6mm;
    height: 6mm;
    border: 0.6mm solid #c5a880;
  }
  .qr-container::before {
    top: 2mm;
    left: 2mm;
    border-right: none;
    border-bottom: none;
  }
  .qr-container::after {
    bottom: 2mm;
    right: 2mm;
    border-left: none;
    border-top: none;
  }
  .qr-img {
    width: 54mm;
    height: 54mm;
    display: block;
  }
  .scan-label {
    font-size: 5mm;
    font-weight: 900;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.3mm;
    margin-top: 1mm;
  }
  .scan-sublabel {
    font-size: 2.8mm;
    color: #a3a3a3;
    margin-top: 1.5mm;
  }

  .table-section {
    text-align: center;
    margin-bottom: 3mm;
  }
  .table-badge {
    display: inline-block;
    border: 0.4mm solid #e5e5e5;
    background: #ffffff;
    border-radius: 3mm;
    padding: 1.5mm 6mm;
    min-width: 25mm;
  }
  .table-label {
    font-size: 2.2mm;
    color: #a3a3a3;
    letter-spacing: 1mm;
    font-weight: bold;
  }
  .table-num {
    font-size: 8mm;
    font-weight: 900;
    color: #111827;
    line-height: 1;
    margin-top: 0.5mm;
  }

  .footer {
    border-top: 0.2mm solid #e5e5e5;
    padding-top: 3mm;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1mm;
  }
  .footer-logo {
    font-size: 3.5mm;
    font-weight: 900;
    color: #111827;
    letter-spacing: 0.8mm;
    text-transform: uppercase;
  }
  .footer-logo-img {
    height: 8mm;
    max-width: 30mm;
    object-fit: contain;
  }
  .footer-phone {
    font-size: 3.2mm;
    font-weight: 700;
    color: #374151;
    letter-spacing: 0.2mm;
  }

  @media screen {
    body { padding: 8mm; background: #f3f4f6; display: flex; flex-wrap: wrap; gap: 6mm; }
    .card { border: 0.3mm solid #d1d5db; border-radius: 2mm; box-shadow: 0 1mm 4mm rgba(0,0,0,0.08); }
  }
</style>
</head>
<body>${cards}</body>
</html>`
}

// ─── Main page ───────────────────────────────────────────────
export default function TablesPage({ params }: { params: Promise<{ restaurantId: string; locale: string }> }) {
  const { restaurantId, locale } = use(params)
  const t = useTranslations('table')
  const tc = useTranslations('common')
  const qc = useQueryClient()
  const rId = Number(restaurantId)

  // ── State ──
  const [addOpen, setAddOpen]         = useState(false)
  const [bulkOpen, setBulkOpen]       = useState(false)
  const [bulkUpTo, setBulkUpTo]       = useState('')
  const [qrItem, setQrItem]           = useState<TableItem | null>(null)
  const [editingId, setEditingId]     = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected]       = useState<Set<number>>(new Set())
  const [showTableNumber, setShowTableNumber] = useState(true)
  const [expandedTableId, setExpandedTableId] = useState<number | null>(null)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Data ──
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', rId],
    queryFn: () => ownerApi.getTables(rId),
  })

  const { data: restaurants = [] } = useQuery({
    queryKey: ['restaurants'],
    queryFn: ownerApi.getRestaurants,
  })
  const restaurantName = restaurants.find(r => r.id === rId)?.name ?? ''

  const { data: overview = [] } = useQuery({
    queryKey: ['tables-overview', rId],
    queryFn: () => ownerApi.getTablesOverview(rId),
    refetchInterval: 15_000,
  })
  const activeTables = overview.filter(t => t.activeOrderCount > 0)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ tableNumber: number }>()

  const addMutation = useMutation({
    mutationFn: (d: { tableNumber: number }) => ownerApi.addTable(rId, d.tableNumber),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', rId] }); toast.success(tc('success')); setAddOpen(false); reset() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const regenMutation = useMutation({
    mutationFn: (tableId: number) => ownerApi.regenerateQr(rId, tableId),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['tables', rId] }); toast.success('QR yenilendi'); setQrItem(data) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const renameMutation = useMutation({
    mutationFn: ({ tableId, tableNumber }: { tableId: number; tableNumber: number }) =>
      ownerApi.renameTable(rId, tableId, tableNumber),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', rId] }); toast.success('Güncellendi'); setEditingId(null) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (tableId: number) => ownerApi.deactivateTable(rId, tableId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', rId] }); toast.success(tc('success')) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const toggleSessionMutation = useMutation({
    mutationFn: (tableId: number) => ownerApi.toggleTableSession(rId, tableId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tables', rId] })
      toast.success(data.sessionOpen ? 'Masa açıldı' : 'Masa kapatıldı')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const toggleGeoMutation = useMutation({
    mutationFn: (tableId: number) => ownerApi.toggleTableGeo(rId, tableId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tables', rId] })
      toast.success(data.geoProtection ? 'Konum koruması açıldı' : 'Konum koruması kapatıldı')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const bulkMutation = useMutation({
    mutationFn: (upTo: number) => ownerApi.bulkCreateTables(rId, upTo),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['tables', rId] })
      toast.success(`${created.length} masa oluşturuldu`)
      setBulkOpen(false)
      setBulkUpTo('')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const APP_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? '')
  const getQrUrl = (qrToken: string) => `${APP_URL}/${locale}/menu/${qrToken}`

  // ── Long-press handlers ──
  const startPress = useCallback((tableId: number) => {
    longPressTimer.current = setTimeout(() => {
      setSelectionMode(true)
      setSelected(prev => new Set([...prev, tableId]))
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40)
    }, 600)
  }, [])

  const endPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }, [])

  const toggleSelect = useCallback((tableId: number) => {
    if (!selectionMode) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(tableId) ? next.delete(tableId) : next.add(tableId)
      return next
    })
  }, [selectionMode])

  const exitSelectionMode = () => { setSelectionMode(false); setSelected(new Set()) }

  // ── PDF export ──
  const exportPdf = useCallback(() => {
    const selectedTables = tables.filter(tb => selected.has(tb.id))
    if (selectedTables.length === 0) return

    const qrImages: Record<number, string> = {}
    selectedTables.forEach(tb => {
      const canvas = document.getElementById(`qr-hidden-${tb.id}`) as HTMLCanvasElement | null
      if (canvas) qrImages[tb.id] = canvas.toDataURL('image/png')
    })

    const logoUrl = `${window.location.origin}/dark-logo.png`
    const html = buildPrintHtml(selectedTables, qrImages, restaurantName, showTableNumber, logoUrl)
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { toast.error('Popup engelleyici PDF açılmasını önledi.'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }, [tables, selected, restaurantName, showTableNumber])

  // ── PDF export (all tables) ──
  const exportAllPdf = useCallback(() => {
    if (tables.length === 0) return
    const qrImages: Record<number, string> = {}
    tables.forEach(tb => {
      const canvas = document.getElementById(`qr-hidden-${tb.id}`) as HTMLCanvasElement | null
      if (canvas) qrImages[tb.id] = canvas.toDataURL('image/png')
    })
    const logoUrl = `${window.location.origin}/dark-logo.png`
    const html = buildPrintHtml(tables, qrImages, restaurantName, showTableNumber, logoUrl)
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { toast.error('Popup engelleyici PDF açılmasını önledi.'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }, [tables, restaurantName, showTableNumber])

  // ── QR download (single) ──
  const downloadQr = (tableNumber: number, tableId: number) => {
    const canvas = document.getElementById(`qr-hidden-${tableId}`) as HTMLCanvasElement | null
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
    a.download = `masa-${tableNumber}-qr.png`
    a.click()
  }

  if (isLoading) return <Spinner />

  const selectedCount = selected.size

  return (
    <>
      {/* iOS-jiggle keyframe */}
      <style>{`
        @keyframes jiggle {
          0%,100% { transform: rotate(0deg) scale(1); }
          20% { transform: rotate(-2deg) scale(1.02); }
          40% { transform: rotate(2deg) scale(1.02); }
          60% { transform: rotate(-1.5deg) scale(1.01); }
          80% { transform: rotate(1.5deg) scale(1.01); }
        }
        .jiggle { animation: jiggle 0.45s ease-in-out infinite; }
      `}</style>

      {/* Hidden QR canvases (off-screen, always rendered for data URL extraction) */}
      <div style={{ position: 'fixed', left: -9999, top: -9999, pointerEvents: 'none' }} aria-hidden="true">
        {tables.map(tb => (
          <QRCodeCanvas
            key={tb.id}
            id={`qr-hidden-${tb.id}`}
            value={getQrUrl(tb.qrToken)}
            size={400}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        ))}
      </div>

      {/* ── Aktif Masalar ── */}
      {activeTables.length > 0 && !selectionMode && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="font-bold text-gray-900 text-sm">Aktif Masalar</p>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{activeTables.length}</span>
          </div>
          <div className="space-y-2">
            {activeTables.map(t => (
              <ActiveTableCard
                key={t.tableId}
                table={t}
                restaurantId={rId}
                expanded={expandedTableId === t.tableId}
                onToggle={() => setExpandedTableId(expandedTableId === t.tableId ? null : t.tableId)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          {selectionMode ? (
            <>
              <p className="text-sm font-bold text-gray-900">
                {selectedCount > 0 ? `${selectedCount} masa seçili` : 'Masalara dokun'}
              </p>
              <div className="flex gap-2">
                {selectedCount > 0 && (
                  <Button size="sm" onClick={exportPdf}>
                    <Printer className="h-4 w-4" />
                    PDF ({selectedCount})
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={exitSelectionMode}>
                  Tamamla
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-bold text-gray-900">Masalar</h3>
              <div className="flex gap-2">
                {tables.length > 0 && (
                  <Button size="sm" variant="outline" onClick={exportAllPdf}>
                    <FileDown className="h-4 w-4" />
                    PDF İndir
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Toplu Oluştur
                </Button>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t('addTable')}
                </Button>
              </div>
            </>
          )}
        </div>

        {selectionMode && (
          <div className="flex items-center justify-between -mt-2">
            <p className="text-xs text-gray-400">Masalara dokun → seç, PDF'e aktar</p>
            <button
              onClick={() => setShowTableNumber(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all',
                showTableNumber
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-400 border-gray-200'
              )}
            >
              <span className={cn('w-3 h-3 rounded-sm border flex-shrink-0', showTableNumber ? 'bg-white border-white' : 'bg-transparent border-gray-300')} />
              Masa No
            </button>
          </div>
        )}

        {tables.length === 0 ? (
          <EmptyState
            icon={<QrCode className="h-12 w-12" />}
            title={t('noTables')}
            action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />{t('addTable')}</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tables.map((table) => {
              const isSelected = selected.has(table.id)
              return (
                <div
                  key={table.id}
                  style={selectionMode ? { animation: `jiggle 0.45s ease-in-out infinite`, animationDelay: `${(table.id % 5) * 60}ms` } : undefined}
                  onMouseDown={() => startPress(table.id)}
                  onMouseUp={endPress}
                  onMouseLeave={endPress}
                  onTouchStart={() => startPress(table.id)}
                  onTouchEnd={endPress}
                  onTouchMove={endPress}
                  onContextMenu={e => e.preventDefault()}
                >
                  <div
                    className={cn(
                      'relative rounded-2xl border-2 bg-white text-center cursor-pointer transition-all select-none overflow-hidden',
                      isSelected ? 'border-green-500 shadow-lg shadow-green-100' : 'border-gray-100 shadow-sm',
                      !selectionMode && 'hover:border-gray-300'
                    )}
                    onClick={() => selectionMode ? toggleSelect(table.id) : undefined}
                  >
                    {/* Selection checkmark */}
                    {selectionMode && (
                      <div className={cn(
                        'absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10',
                        isSelected ? 'bg-green-500' : 'bg-gray-200'
                      )}>
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                      </div>
                    )}

                    {/* X badge */}
                    {selectionMode && (
                      <div
                        className="absolute top-1.5 right-1.5 w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center z-10 cursor-pointer"
                        onClick={e => { e.stopPropagation(); setSelected(prev => { const n = new Set(prev); n.delete(table.id); return n }) }}
                      >
                        <X className="h-3 w-3 text-white" strokeWidth={2.5} />
                      </div>
                    )}

                    <div className="py-5 px-3">
                      {/* QR icon / preview */}
                      <div
                        className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-3 cursor-pointer active:scale-95 transition-transform"
                        onClick={e => {
                          if (selectionMode) return
                          e.stopPropagation()
                          setQrItem(table)
                        }}
                      >
                        <QrCode className="h-6 w-6 text-white" />
                      </div>

                      {/* Table number / edit */}
                      {editingId === table.id && !selectionMode ? (
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <input
                            type="number" min="1" value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') renameMutation.mutate({ tableId: table.id, tableNumber: Number(editingValue) })
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="w-16 text-center font-bold text-lg border-2 border-gray-900 rounded-lg focus:outline-none px-1 py-0.5"
                            autoFocus
                          />
                          <button onClick={() => renameMutation.mutate({ tableId: table.id, tableNumber: Number(editingValue) })} className="p-1 rounded-lg bg-gray-900 text-white">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <p className="font-bold text-gray-900 text-xl">{table.tableNumber}</p>
                          {!selectionMode && (
                            <button
                              onClick={e => { e.stopPropagation(); setEditingId(table.id); setEditingValue(String(table.tableNumber)) }}
                              className="p-1 rounded-md hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mb-3">{t('tableNumber')}</p>

                      {/* Kapalı masa uyarısı */}
                      {!table.sessionOpen && (
                        <div className="flex items-center justify-center gap-1 bg-red-50 rounded-lg px-2 py-1 mb-2">
                          <Lock className="h-3 w-3 text-red-400" />
                          <span className="text-red-500 text-xs font-semibold">Kapalı</span>
                        </div>
                      )}

                      {!selectionMode && (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={e => { e.stopPropagation(); toggleSessionMutation.mutate(table.id) }}
                            className={cn(
                              'p-2 rounded-lg transition-colors',
                              table.sessionOpen
                                ? 'hover:bg-orange-50 text-gray-400 hover:text-orange-500'
                                : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'
                            )}
                            title={table.sessionOpen ? 'Masayı kapat' : 'Masayı aç'}
                          >
                            {table.sessionOpen ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); toggleGeoMutation.mutate(table.id) }}
                            className={cn(
                              'p-2 rounded-lg transition-colors',
                              table.geoProtection
                                ? 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                                : 'hover:bg-gray-100 text-gray-300 hover:text-gray-500'
                            )}
                            title={table.geoProtection ? 'Konum korumasını kapat' : 'Konum korumasını aç'}
                          >
                            {table.geoProtection ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                          </button>
                          <button onClick={() => regenMutation.mutate(table.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400" title={t('regenerateQr')}>
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm('Masayı pasif yapmak istiyor musunuz?')) deleteMutation.mutate(table.id) }}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!selectionMode && tables.length > 0 && (
          <p className="text-xs text-gray-400 text-center pt-1">
            Uzun basarak QR seçimi yapabilir ve PDF olarak yazdırabilirsiniz
          </p>
        )}

        {/* Bulk Create Modal */}
        <Modal open={bulkOpen} onClose={() => { setBulkOpen(false); setBulkUpTo('') }} title="Toplu Masa Oluştur">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              1'den girdiğiniz numaraya kadar masa oluşturur.<br />
              Zaten var olan masa numaralarını atlar.
            </p>
            {tables.length > 0 && (
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500">
                Mevcut masalar: {[...tables].sort((a, b) => a.tableNumber - b.tableNumber).map(t => t.tableNumber).join(', ')}
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Kaçıncı masaya kadar?
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={bulkUpTo}
                onChange={e => setBulkUpTo(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && bulkUpTo) bulkMutation.mutate(Number(bulkUpTo)) }}
                placeholder="Örn: 20"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
                autoFocus
              />
              {bulkUpTo && Number(bulkUpTo) > 0 && (
                <p className="text-xs text-gray-400 mt-1.5">
                  1–{bulkUpTo} arası eksik masa numaraları oluşturulacak.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth type="button" onClick={() => { setBulkOpen(false); setBulkUpTo('') }}>
                {tc('cancel')}
              </Button>
              <Button
                fullWidth
                loading={bulkMutation.isPending}
                disabled={!bulkUpTo || Number(bulkUpTo) < 1}
                onClick={() => bulkMutation.mutate(Number(bulkUpTo))}
              >
                Oluştur
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Table Modal */}
        <Modal open={addOpen} onClose={() => { setAddOpen(false); reset() }} title={t('addTable')}>
          <form onSubmit={handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
            <Input
              label={t('tableNumber')} required type="number" min="1" placeholder="1"
              error={errors.tableNumber?.message}
              {...register('tableNumber', { required: 'Masa numarası zorunlu', min: 1 })}
            />
            <div className="flex gap-3">
              <Button variant="outline" fullWidth type="button" onClick={() => { setAddOpen(false); reset() }}>{tc('cancel')}</Button>
              <Button fullWidth type="submit" loading={addMutation.isPending}>{tc('save')}</Button>
            </div>
          </form>
        </Modal>

        {/* QR Modal */}
        {qrItem && (
          <Modal open={!!qrItem} onClose={() => setQrItem(null)} title={`Masa ${qrItem.tableNumber} — QR`}>
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100">
                <QRCodeCanvas
                  id="qr-modal-canvas"
                  value={getQrUrl(qrItem.qrToken)}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                />
              </div>
              <p className="text-xs text-gray-400 text-center break-all px-2">{getQrUrl(qrItem.qrToken)}</p>
              <div className="flex gap-3 w-full">
                <Button variant="outline" fullWidth onClick={() => { navigator.clipboard.writeText(getQrUrl(qrItem.qrToken)); toast.success('Link kopyalandı') }}>
                  Link Kopyala
                </Button>
                <Button fullWidth onClick={() => downloadQr(qrItem.tableNumber, qrItem.id)}>
                  {t('downloadQr')}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </>
  )
}

// ─── Active Table Card ───────────────────────────────────────
const ORDER_STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string; pulse: boolean }> = {
  PENDING:   { label: 'Bekliyor',        bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400',   pulse: true  },
  PREPARING: { label: 'Hazırlanıyor',    bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400',  pulse: true  },
  READY:     { label: 'Hazır ✓',         bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  pulse: true  },
  DELIVERED: { label: 'Teslim Edildi',   bg: 'bg-gray-50',   text: 'text-gray-500',   dot: 'bg-gray-300',   pulse: false },
}

function ActiveTableCard({
  table, restaurantId, expanded, onToggle,
}: {
  table: TableOverviewResponse
  restaurantId: number
  expanded: boolean
  onToggle: () => void
}) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['table-orders', restaurantId, table.tableId],
    queryFn: () => ownerApi.getTableOrders(restaurantId, table.tableId),
    enabled: expanded,
    refetchInterval: expanded ? 10_000 : false,
  })

  const activeOrders = orders.filter(o => o.status !== 'CANCELLED')

  return (
    <div className={cn('bg-white rounded-2xl border overflow-hidden transition-shadow', expanded ? 'border-gray-200 shadow-md' : 'border-gray-100 shadow-sm')}>
      {/* Özet satırı */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-base leading-none">{table.tableNumber}</span>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 text-sm">Masa {table.tableNumber}</p>
            <p className="text-xs text-gray-400 mt-0.5">{table.activeOrderCount} aktif sipariş</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-black text-gray-900 text-base">{formatPrice(table.activeTotal)}</p>
            <p className="text-xs text-gray-400">toplam</p>
          </div>
          <div className={cn('w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center transition-transform flex-shrink-0', expanded ? 'rotate-180' : '')}>
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </button>

      {/* Detay */}
      {expanded && (
        <div className="border-t border-gray-100">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : activeOrders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-5">Aktif sipariş yok</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeOrders.map(order => {
                const cfg = ORDER_STATUS_CFG[order.status] ?? ORDER_STATUS_CFG.PENDING
                return (
                  <div key={order.id} className="px-4 pt-3 pb-3.5">
                    {/* Sipariş başlığı */}
                    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2.5', cfg.bg)}>
                      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot, cfg.pulse && 'animate-pulse')} />
                      <span className={cn('text-xs font-bold', cfg.text)}>{cfg.label}</span>
                      <span className="text-xs text-gray-400 ml-1">{formatPrice(order.totalAmount)}</span>
                    </div>
                    {/* Kalemler */}
                    <div className="space-y-2">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.menuItemName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 11l19-9-9 19-2-8-8-2z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-snug">
                              <span className="text-gray-400 font-medium">{item.quantity}×</span> {item.menuItemName}
                            </p>
                            {item.selectedOptions.length > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{item.selectedOptions.map(o => o.optionName).join(' · ')}</p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-gray-700 flex-shrink-0">{formatPrice(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {/* Toplam */}
              <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ödenecek</span>
                <span className="font-black text-gray-900 text-lg">{formatPrice(table.activeTotal)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
