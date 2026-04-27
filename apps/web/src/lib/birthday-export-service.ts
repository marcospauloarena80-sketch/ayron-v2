import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns/format'

export interface PatientBirthdayRow {
  full_name: string
  birth_date: string
  phone?: string
  email?: string
  tags?: string[]
  responsavel?: string
  current_status?: string
  notes?: string
}

export interface BirthdayExportOptions {
  format: 'excel' | 'pdf'
  source: 'client' | 'server'
  dateFrom: Date
  dateTo: Date
  patients: PatientBirthdayRow[]
}

function isInBirthdayRange(birthDate: string, dateFrom: Date, dateTo: Date): boolean {
  const d = new Date(birthDate)
  if (isNaN(d.getTime())) return false
  const bMonth = d.getUTCMonth() + 1
  const bDay = d.getUTCDate()
  const fromMonth = dateFrom.getMonth() + 1
  const fromDay = dateFrom.getDate()
  const toMonth = dateTo.getMonth() + 1
  const toDay = dateTo.getDate()

  const bMD = bMonth * 100 + bDay
  const fromMD = fromMonth * 100 + fromDay
  const toMD = toMonth * 100 + toDay

  if (fromMD <= toMD) {
    return bMD >= fromMD && bMD <= toMD
  }
  // cross-year: e.g. 20/12 → 10/01
  return bMD >= fromMD || bMD <= toMD
}

function calcAge(birthDate: string): number {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / 31_557_600_000)
}

function filterAndExclude(patients: PatientBirthdayRow[], dateFrom: Date, dateTo: Date) {
  let excluded = 0
  const included: PatientBirthdayRow[] = []
  for (const p of patients) {
    if (!p.birth_date || isNaN(new Date(p.birth_date).getTime())) {
      excluded++
      continue
    }
    if (isInBirthdayRange(p.birth_date, dateFrom, dateTo)) included.push(p)
  }
  return { included, excluded }
}

type ExportRow = {
  nome: string
  nascimento: string
  idade: string
  telefone: string
  email: string
  tags: string
  responsavel: string
  status: string
  obs: string
}

function buildRows(included: PatientBirthdayRow[]): ExportRow[] {
  return included.map(p => ({
    nome:       p.full_name,
    nascimento: format(new Date(p.birth_date), 'dd/MM/yyyy'),
    idade:      String(calcAge(p.birth_date)),
    telefone:   p.phone ?? '',
    email:      p.email ?? '',
    tags:       (p.tags ?? []).join(', '),
    responsavel: p.responsavel ?? '',
    status:     p.current_status ?? '',
    obs:        p.notes ?? '',
  }))
}

const COLUMNS = ['Nome', 'Nascimento', 'Idade', 'Telefone', 'E-mail', 'Tags', 'Responsável', 'Status', 'Observação']
const KEYS: (keyof ExportRow)[] = ['nome', 'nascimento', 'idade', 'telefone', 'email', 'tags', 'responsavel', 'status', 'obs']

export const birthdayExportService = {
  exportExcel(rows: PatientBirthdayRow[], dateFrom: Date, dateTo: Date): void {
    const { included, excluded } = filterAndExclude(rows, dateFrom, dateTo)
    const data = buildRows(included)
    const wsData: string[][] = [COLUMNS, ...data.map(r => KEYS.map(k => r[k]))]
    if (excluded > 0) {
      wsData.push([`${excluded} paciente(s) sem data de nascimento não incluído(s)`])
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Aniversariantes')
    XLSX.writeFile(wb, `aniversariantes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  },

  exportPDF(rows: PatientBirthdayRow[], dateFrom: Date, dateTo: Date): void {
    const { included, excluded } = filterAndExclude(rows, dateFrom, dateTo)
    const data = buildRows(included)
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Aniversariantes', 14, 16)
    doc.setFontSize(10)
    doc.text(`Período: ${format(dateFrom, 'dd/MM')} até ${format(dateTo, 'dd/MM')}`, 14, 23)
    autoTable(doc, {
      head: [COLUMNS],
      body: data.map(r => KEYS.map(k => r[k])),
      startY: 28,
      styles: { fontSize: 8 },
    })
    if (excluded > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY ?? 28
      doc.setFontSize(8)
      doc.text(`${excluded} paciente(s) sem data de nascimento não incluído(s)`, 14, finalY + 6)
    }
    doc.save(`aniversariantes_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  },

  async export(options: BirthdayExportOptions): Promise<void> {
    if (options.format === 'excel') {
      this.exportExcel(options.patients, options.dateFrom, options.dateTo)
    } else {
      this.exportPDF(options.patients, options.dateFrom, options.dateTo)
    }
  },
}
