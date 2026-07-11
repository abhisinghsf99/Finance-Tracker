import { describe, it, expect } from "vitest"
import {
  buildTransactionsWorkbook,
  uniqueSheetName,
  type ExportAccount,
  type ExportTransaction,
} from "@/lib/export/build-workbook"

function account(overrides: Partial<ExportAccount> = {}): ExportAccount {
  return {
    id: "a1",
    name: "Checking",
    official_name: null,
    type: "depository",
    subtype: "checking",
    mask: "0000",
    balance_current: 500,
    ...overrides,
  }
}

function txn(overrides: Partial<ExportTransaction> = {}): ExportTransaction {
  return {
    account_id: "a1",
    date: "2026-07-01",
    name: "Coffee",
    merchant_name: "Sweetgreen",
    category_primary: "FOOD_AND_DRINK",
    category_detailed: "FOOD_AND_DRINK_COFFEE",
    payment_channel: "in store",
    is_pending: false,
    amount: 12.5,
    iso_currency_code: "USD",
    ...overrides,
  }
}

const BASE = { start: "2026-07-01", end: "2026-07-31", generatedOn: "2026-07-11" }

describe("buildTransactionsWorkbook", () => {
  it("creates a Summary sheet plus one sheet per account with transactions", () => {
    const accounts = [
      account({ id: "a1", name: "Checking" }),
      account({ id: "a2", name: "Credit card", type: "credit", subtype: "credit card" }),
    ]
    const transactions = [
      txn({ account_id: "a1" }),
      txn({ account_id: "a2", amount: 40 }),
    ]

    const wb = buildTransactionsWorkbook({ accounts, transactions, ...BASE })

    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Summary",
      "Checking",
      "Credit card",
    ])
  })

  it("omits accounts that have no transactions in range", () => {
    const accounts = [
      account({ id: "a1", name: "Checking" }),
      account({ id: "a2", name: "Empty Savings" }),
    ]
    const transactions = [txn({ account_id: "a1" })]

    const wb = buildTransactionsWorkbook({ accounts, transactions, ...BASE })

    const names = wb.worksheets.map((w) => w.name)
    expect(names).toContain("Checking")
    expect(names).not.toContain("Empty Savings")
  })

  it("splits transactions to the correct account sheet", () => {
    const accounts = [
      account({ id: "a1", name: "Checking" }),
      account({ id: "a2", name: "Credit card" }),
    ]
    const transactions = [
      txn({ account_id: "a1", name: "Rent" }),
      txn({ account_id: "a2", name: "Amazon" }),
      txn({ account_id: "a1", name: "Salary", amount: -3000 }),
    ]

    const wb = buildTransactionsWorkbook({ accounts, transactions, ...BASE })
    const checking = wb.getWorksheet("Checking")!
    const descriptions: string[] = []
    checking.eachRow((row) => {
      const v = row.getCell(2).value
      if (typeof v === "string") descriptions.push(v)
    })

    expect(descriptions).toContain("Rent")
    expect(descriptions).toContain("Salary")
    expect(descriptions).not.toContain("Amazon")
  })

  it("labels debits and credits and totals them correctly", () => {
    const accounts = [account({ id: "a1", name: "Checking" })]
    const transactions = [
      txn({ account_id: "a1", amount: 100 }), // debit
      txn({ account_id: "a1", amount: 50 }), // debit
      txn({ account_id: "a1", amount: -30 }), // credit
    ]

    const wb = buildTransactionsWorkbook({ accounts, transactions, ...BASE })
    const summary = wb.getWorksheet("Summary")!

    // Find the account row: [name, type, count, out, in, net]
    let out: unknown, inbound: unknown, net: unknown
    summary.eachRow((row) => {
      if (row.getCell(1).value === "Checking") {
        out = row.getCell(4).value
        inbound = row.getCell(5).value
        net = row.getCell(6).value
      }
    })

    expect(out).toBe(150)
    expect(inbound).toBe(30)
    expect(net).toBe(-120)
  })

  it("shows the amount as an absolute value with an explicit Type", () => {
    const accounts = [account({ id: "a1", name: "Checking" })]
    const transactions = [txn({ account_id: "a1", name: "Refund", amount: -25 })]

    const wb = buildTransactionsWorkbook({ accounts, transactions, ...BASE })
    const sheet = wb.getWorksheet("Checking")!

    let typeCell: unknown, amountCell: unknown
    sheet.eachRow((row) => {
      if (row.getCell(2).value === "Refund") {
        typeCell = row.getCell(8).value
        amountCell = row.getCell(9).value
      }
    })

    expect(typeCell).toBe("Credit")
    expect(amountCell).toBe(25)
  })
})

describe("uniqueSheetName", () => {
  it("strips characters Excel forbids in sheet names", () => {
    const name = uniqueSheetName("Plaid/Checking:2026", new Set())
    expect(name).not.toMatch(/[:\\/?*[\]]/)
  })

  it("truncates to 31 characters", () => {
    const name = uniqueSheetName("A".repeat(50), new Set())
    expect(name.length).toBeLessThanOrEqual(31)
  })

  it("de-duplicates collisions case-insensitively", () => {
    const used = new Set<string>()
    const first = uniqueSheetName("Checking", used)
    const second = uniqueSheetName("checking", used)
    expect(first).toBe("Checking")
    expect(second).not.toBe(first)
    expect(second.toLowerCase()).not.toBe(first.toLowerCase())
  })

  it("falls back to a default when the name is entirely invalid", () => {
    const name = uniqueSheetName("///", new Set())
    expect(name.length).toBeGreaterThan(0)
  })
})
