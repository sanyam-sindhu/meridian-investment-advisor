import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function money(n) {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(2)}M`
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`
  return `${sign}$${abs.toLocaleString()}`
}

function header(doc, title) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 58, 95)
  doc.text('MERIDIAN ADVISORY', 40, 42)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text('Wealth Management Workbench', 40, 56)
  doc.setDrawColor(212, 212, 216)
  doc.line(40, 66, 555, 66)
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 40, 92)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(new Date().toLocaleDateString(), 555, 92, { align: 'right' })
}

export function exportPortfolioPdf(rows) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  header(doc, 'Portfolio Recommendations Report')

  doc.setFontSize(10)
  doc.setTextColor(51, 65, 85)
  doc.text(`${rows.length} client recommendation${rows.length === 1 ? '' : 's'} under review.`, 40, 114)

  autoTable(doc, {
    startY: 130,
    head: [['Client', 'Strategy', 'Decision', 'Feas.', 'Impact', 'Return', 'Cost']],
    body: rows.map((r) => [
      r.client_name,
      r.strategy_name,
      r.decision,
      r.feasibility,
      r.impact,
      `${r.projected_return}%`,
      money(r.implementation_cost),
    ]),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  })

  doc.save(`portfolio-report-${Date.now()}.pdf`)
}

export function exportClientPdf(r) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  header(doc, `Client Report — ${r.client_name}`)

  let y = 120
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Executive Summary', 40, y)
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const summary = `Strategy: ${r.strategy_name}. Decision: ${r.decision.toUpperCase()}. Feasibility ${r.feasibility}/100, Impact ${r.impact}/100. Projected annual return ${r.projected_return}% vs. current ${r.current_return}%.`
  const lines = doc.splitTextToSize(summary, 515)
  doc.text(lines, 40, y)
  y += lines.length * 12 + 10

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Projected annual return', `${r.projected_return}%`],
      ['Current annual return', `${r.current_return}%`],
      ['3-year projected value', money(r.projected_3yr_value)],
      ['Implementation cost', money(r.implementation_cost)],
      ['Tax implications', money(r.tax_implications)],
      ['Feasibility score', `${r.feasibility}/100`],
      ['Impact score', `${r.impact}/100`],
    ],
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
  })

  y = doc.lastAutoTable.finalY + 20

  const section = (title, items) => {
    if (!items || !items.length) return
    if (y > 700) { doc.addPage(); y = 60 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text(title, 40, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(51, 65, 85)
    items.forEach((it) => {
      const wrapped = doc.splitTextToSize(`• ${it}`, 515)
      wrapped.forEach((ln) => {
        if (y > 750) { doc.addPage(); y = 60 }
        doc.text(ln, 40, y)
        y += 12
      })
    })
    y += 8
  }

  section('Portfolio Findings', r.portfolio?.findings || [])
  section('Risk Findings', r.risk?.findings || [])
  section('Recommended Actions', r.recommendation?.actions || [])
  section('Risks & Considerations', r.recommendation?.risks || [])

  doc.save(`client-${r.client_id}-report.pdf`)
}
