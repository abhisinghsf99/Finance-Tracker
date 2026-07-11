import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { EXCLUDED_SUBTYPES } from "@/lib/plaid/excluded-accounts"
import {
  buildTransactionsWorkbook,
  type ExportAccount,
  type ExportTransaction,
} from "@/lib/export/build-workbook"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/**
 * Export transactions in a date range as an .xlsx workbook, one sheet per
 * account plus a summary. Date range comes from the ?start= and ?end= query
 * params (inclusive, YYYY-MM-DD).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get("start")
  const end = searchParams.get("end")

  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json(
      { error: "start and end must be provided as YYYY-MM-DD dates" },
      { status: 400 }
    )
  }
  if (start > end) {
    return NextResponse.json(
      { error: "start date must be on or before end date" },
      { status: 400 }
    )
  }

  const supabase = createServerSupabase()

  const [accountsRes, txnsRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, official_name, type, subtype, mask, balance_current")
      .not("subtype", "in", `(${[...EXCLUDED_SUBTYPES].join(",")})`)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select(
        "account_id, date, name, merchant_name, category_primary, category_detailed, payment_channel, is_pending, amount, iso_currency_code"
      )
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true }),
  ])

  if (accountsRes.error) {
    return NextResponse.json({ error: accountsRes.error.message }, { status: 500 })
  }
  if (txnsRes.error) {
    return NextResponse.json({ error: txnsRes.error.message }, { status: 500 })
  }

  const accounts = (accountsRes.data ?? []) as ExportAccount[]
  const includedIds = new Set(accounts.map((a) => a.id))
  // Drop any transaction whose account was filtered out (e.g. excluded subtype).
  const transactions = ((txnsRes.data ?? []) as ExportTransaction[]).filter((t) =>
    includedIds.has(t.account_id)
  )

  if (transactions.length === 0) {
    return NextResponse.json(
      { error: "No transactions found in that date range." },
      { status: 404 }
    )
  }

  const generatedOn = new Date().toISOString().slice(0, 10)
  const workbook = buildTransactionsWorkbook({
    accounts,
    transactions,
    start,
    end,
    generatedOn,
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `finance-export_${start}_to_${end}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
