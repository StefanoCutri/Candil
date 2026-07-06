// Exporta el plan de estudio como PDF (100% en el cliente).
// Se importa dinámicamente desde la vista del plan para no engordar el bundle inicial.
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type BloquePdf = {
  hora_inicio: string
  hora_fin: string
  tema: string
  tipo: string
  duracion_minutos: number
}

type DiaPdf = {
  fecha: string
  dia_nombre: string
  bloques: BloquePdf[]
}

export type PlanPdfData = {
  materia: string
  tipo: string
  fecha: string
  hora: string | null
  dias: DiaPdf[]
  labels: {
    titulo: string       // "Plan de estudio"
    tipoExamen: string   // "Tipo de examen"
    fecha: string        // "Fecha"
    hora: string         // "Hora"
    colHora: string
    colTema: string
    colTipo: string
    colDuracion: string
    footer: string       // "Generado con Candil — candil.app"
  }
  dateLocale: string
}

const INK = '#2A2018'
const INK_SOFT = '#6B5D4F'
const BEIGE = '#F5E6D0'
const BORDER = '#E8DCC8'

function formatDuracion(min: number) {
  if (!min) return '—'
  return min >= 60 ? `${(min / 60).toFixed(min % 60 === 0 ? 0 : 1)} hs` : `${min} min`
}

function formatFecha(f: string, dateLocale: string) {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function exportPlanPdf(data: PlanPdfData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 16

  // ── Header ──
  doc.setTextColor(INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(`Candil — ${data.labels.titulo}`, marginX, 22)

  doc.setFontSize(14)
  doc.setTextColor(INK_SOFT)
  doc.text(data.materia, marginX, 30)

  // ── Info ──
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(INK_SOFT)
  const infoParts = [
    `${data.labels.tipoExamen}: ${data.tipo || '—'}`,
    `${data.labels.fecha}: ${formatFecha(data.fecha, data.dateLocale)}`,
  ]
  if (data.hora) infoParts.push(`${data.labels.hora}: ${data.hora.slice(0, 5)} hs`)
  doc.text(infoParts.join('   ·   '), marginX, 38)

  doc.setDrawColor(BORDER)
  doc.setLineWidth(0.3)
  doc.line(marginX, 42, pageW - marginX, 42)

  let cursorY = 50

  // ── Días ──
  for (const dia of data.dias) {
    if (cursorY > 250) { doc.addPage(); cursorY = 20 }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(INK)
    doc.text(`${dia.dia_nombre} · ${formatFecha(dia.fecha, data.dateLocale)}`, marginX, cursorY)
    cursorY += 4

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [[data.labels.colHora, data.labels.colTema, data.labels.colTipo, data.labels.colDuracion]],
      body: dia.bloques.map(b => [
        `${b.hora_inicio}–${b.hora_fin}`,
        b.tema,
        b.tipo,
        formatDuracion(b.duracion_minutos),
      ]),
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, lineColor: BORDER, lineWidth: 0.2, cellPadding: 2.5 },
      headStyles: { fillColor: BEIGE, textColor: INK, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: '#FDFAF4' },
      columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 26 }, 3: { cellWidth: 24 } },
      theme: 'grid',
    })

    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // ── Footer en cada página ──
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(INK_SOFT)
    doc.text(data.labels.footer, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
  }

  const slug = data.materia.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'plan'
  doc.save(`candil-plan-${slug}.pdf`)
}
