import ExcelJS from "exceljs"

export interface ExportAccount {
  id: string
  name: string | null
  official_name: string | null
  type: string
  subtype: string | null
  mask: string | null
  balance_current: number | null
}

export interface ExportTransaction {
  account_id: string
  date: string
  name: string | null
  merchant_name: string | null
  category_primary: string | null
  category_detailed: string | null
  payment_channel: string | null
  is_pending: boolean
  amount: number
  iso_currency_code: string | null
}

export interface BuildWorkbookParams {
  accounts: ExportAccount[]
  transactions: ExportTransaction[]
  start: string
  end: string
  /** When the file is generated, YYYY-MM-DD. Passed in so the builder stays pure. */
  generatedOn: string
}

const CURRENCY_FMT = "$#,##0.00"
const HEADER_FILL = "FF0F766E" // teal-700, close to the app's primary
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } }

const TXN_COLUMNS = [
  { header: "Date", width: 12 },
  { header: "Description", width: 34 },
  { header: "Merchant", width: 22 },
  { header: "Category", width: 22 },
  { header: "Detail", width: 28 },
  { header: "Channel", width: 14 },
  { header: "Status", width: 10 },
  { header: "Type", width: 9 },
  { header: "Amount", width: 14 },
]

/**
 * Build an .xlsx workbook that breaks transactions out by account: a Summary
 * sheet, then one sheet per account. Amounts are shown as absolute values with
 * an explicit Debit/Credit "Type" column, so the report never depends on
 * knowing Plaid's counterintuitive sign convention.
 */
export function buildTransactionsWorkbook(
  params: BuildWorkbookParams
): ExcelJS.Workbook {
  const { accounts, transactions, start, end, generatedOn } = params

  const wb = new ExcelJS.Workbook()
  wb.creator = "Finance Tracker"
  wb.created = new Date(`${generatedOn}T00:00:00Z`)

  // Only export accounts that actually have transactions in range, but keep the
  // account order stable for a predictable sheet order.
  const byAccount = new Map<string, ExportTransaction[]>()
  for (const txn of transactions) {
    const list = byAccount.get(txn.account_id)
    if (list) list.push(txn)
    else byAccount.set(txn.account_id, [txn])
  }

  const accountsWithTxns = accounts.filter((a) => byAccount.has(a.id))

  const usedSheetNames = new Set<string>()
  const summary = wb.addWorksheet("Summary")
  buildSummarySheet(summary, {
    accounts: accountsWithTxns,
    byAccount,
    start,
    end,
    generatedOn,
  })

  for (const account of accountsWithTxns) {
    const txns = [...(byAccount.get(account.id) ?? [])].sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    const sheetName = uniqueSheetName(
      accountLabel(account),
      usedSheetNames
    )
    const sheet = wb.addWorksheet(sheetName)
    buildAccountSheet(sheet, account, txns)
  }

  return wb
}

function buildSummarySheet(
  sheet: ExcelJS.Worksheet,
  ctx: {
    accounts: ExportAccount[]
    byAccount: Map<string, ExportTransaction[]>
    start: string
    end: string
    generatedOn: string
  }
) {
  sheet.mergeCells("A1:F1")
  const title = sheet.getCell("A1")
  title.value = "Finance Tracker — Transaction Export"
  title.font = { bold: true, size: 14 }

  sheet.getCell("A2").value = "Date range:"
  sheet.getCell("B2").value = `${ctx.start} to ${ctx.end}`
  sheet.getCell("A3").value = "Generated:"
  sheet.getCell("B3").value = ctx.generatedOn

  const headerRowIdx = 5
  const header = sheet.getRow(headerRowIdx)
  header.values = [
    "Account",
    "Type",
    "Transactions",
    "Total Out (Debits)",
    "Total In (Credits)",
    "Net (In − Out)",
  ]
  styleHeaderRow(header)

  const widths = [30, 16, 14, 18, 18, 16]
  widths.forEach((w, i) => (sheet.getColumn(i + 1).width = w))

  let grandOut = 0
  let grandIn = 0
  let grandCount = 0

  ctx.accounts.forEach((account) => {
    const txns = ctx.byAccount.get(account.id) ?? []
    const totals = totalsFor(txns)
    grandOut += totals.out
    grandIn += totals.in
    grandCount += txns.length

    const row = sheet.addRow([
      account.name ?? account.official_name ?? "Account",
      prettyType(account),
      txns.length,
      totals.out,
      totals.in,
      round2(totals.in - totals.out),
    ])
    ;[4, 5, 6].forEach((c) => (row.getCell(c).numFmt = CURRENCY_FMT))
  })

  const totalRow = sheet.addRow([
    "All accounts",
    "",
    grandCount,
    round2(grandOut),
    round2(grandIn),
    round2(grandIn - grandOut),
  ])
  totalRow.font = { bold: true }
  ;[4, 5, 6].forEach((c) => (totalRow.getCell(c).numFmt = CURRENCY_FMT))

  sheet.views = [{ state: "frozen", ySplit: headerRowIdx }]
}

function buildAccountSheet(
  sheet: ExcelJS.Worksheet,
  account: ExportAccount,
  txns: ExportTransaction[]
) {
  sheet.mergeCells("A1:E1")
  const name = sheet.getCell("A1")
  name.value = account.name ?? account.official_name ?? "Account"
  name.font = { bold: true, size: 13 }

  const meta: string[] = [prettyType(account)]
  if (account.mask) meta.push(`••${account.mask}`)
  if (account.balance_current != null) {
    meta.push(`Balance: ${formatUSD(account.balance_current)}`)
  }
  sheet.getCell("A2").value = meta.join("   •   ")
  sheet.getCell("A2").font = { color: { argb: "FF6B7280" } }

  const headerRowIdx = 4
  const header = sheet.getRow(headerRowIdx)
  header.values = TXN_COLUMNS.map((c) => c.header)
  styleHeaderRow(header)
  TXN_COLUMNS.forEach((c, i) => (sheet.getColumn(i + 1).width = c.width))

  const amountCol = TXN_COLUMNS.length // 9
  for (const txn of txns) {
    const isDebit = txn.amount > 0
    const row = sheet.addRow([
      txn.date,
      txn.name ?? "",
      txn.merchant_name ?? "",
      prettify(txn.category_primary),
      prettify(txn.category_detailed),
      prettify(txn.payment_channel),
      txn.is_pending ? "Pending" : "Posted",
      isDebit ? "Debit" : "Credit",
      Math.abs(txn.amount),
    ])
    row.getCell(amountCol).numFmt = CURRENCY_FMT
  }

  const totals = totalsFor(txns)
  sheet.addRow([])
  const outRow = sheet.addRow(labelValueRow("Total Out (Debits)", totals.out, amountCol))
  const inRow = sheet.addRow(labelValueRow("Total In (Credits)", totals.in, amountCol))
  const netRow = sheet.addRow(
    labelValueRow("Net (In − Out)", round2(totals.in - totals.out), amountCol)
  )
  for (const row of [outRow, inRow, netRow]) {
    row.font = { bold: true }
    row.getCell(amountCol).numFmt = CURRENCY_FMT
  }

  sheet.views = [{ state: "frozen", ySplit: headerRowIdx }]
}

/** Row of [label spanning to the amount column, then the value in that column]. */
function labelValueRow(label: string, value: number, amountCol: number): (string | number)[] {
  const cells: (string | number)[] = new Array(amountCol).fill("")
  cells[amountCol - 2] = label
  cells[amountCol - 1] = value
  return cells
}

function totalsFor(txns: ExportTransaction[]): { out: number; in: number } {
  let out = 0
  let inbound = 0
  for (const t of txns) {
    if (t.amount > 0) out += t.amount
    else inbound += Math.abs(t.amount)
  }
  return { out: round2(out), in: round2(inbound) }
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = HEADER_FONT
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    }
  })
}

function accountLabel(account: ExportAccount): string {
  return account.name ?? account.official_name ?? "Account"
}

function prettyType(account: ExportAccount): string {
  const parts = [account.type, account.subtype].filter(Boolean) as string[]
  return parts.map(prettify).join(" / ")
}

function prettify(value: string | null): string {
  if (!value) return ""
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Excel sheet names must be 1–31 chars, exclude : \ / ? * [ ], and be unique
 * (case-insensitive). Sanitize, truncate, then de-duplicate with a numeric
 * suffix that still fits in 31 chars.
 */
export function uniqueSheetName(base: string, used: Set<string>): string {
  const cleaned = (base.replace(/[:\\/?*[\]]/g, " ").trim() || "Account").slice(0, 31)

  let candidate = cleaned
  let n = 2
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`
    candidate = cleaned.slice(0, 31 - suffix.length) + suffix
    n++
  }
  used.add(candidate.toLowerCase())
  return candidate
}
