"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { formatCurrency } from "@/lib/plaid-amounts"
import { useDashboardStore } from "@/lib/store/dashboard-store"
import { calculatePayoff, calculateMinPaymentPayoff } from "@/lib/payoff"

export function PaymentCalculator() {
  const { accounts, creditLiabilities, getPurchaseAPR } = useDashboardStore()

  const creditAccounts = accounts.filter((a) => a.type === "credit" || a.type === "loan")

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    creditAccounts[0]?.id ?? ""
  )
  const [sliderValue, setSliderValue] = useState<number[]>([0])

  const selectedAccount = creditAccounts.find(
    (a) => a.id === selectedAccountId
  )
  const liability = creditLiabilities.find(
    (l) => l.account_id === selectedAccountId
  )
  const apr = getPurchaseAPR(selectedAccountId)
  const balance = selectedAccount?.balance_current ?? 0
  const minPayment = liability?.minimum_payment_amount ?? 25

  // Slider range: minimum payment → full balance
  const sliderMin = Math.max(minPayment, 1)
  const sliderMax = Math.max(balance, sliderMin + 1)
  const sliderStep = Math.max(1, Math.round(sliderMax / 200))

  // Default slider to minimum payment
  const rawPayment = sliderValue[0] > 0 ? sliderValue[0] : sliderMin

  // The stepped slider can't always land exactly on sliderMax, so its topmost
  // reachable notch falls a step short of the balance. Treat anything within
  // one step of the top as "pay the full balance" — otherwise maxing the slider
  // leaves a small stub that costs a second month and phantom interest.
  const effectivePayment =
    rawPayment >= sliderMax - sliderStep ? balance : rawPayment

  const result = useMemo(
    () =>
      apr !== null
        ? calculatePayoff(balance, effectivePayment, apr)
        : null,
    [balance, effectivePayment, apr]
  )

  const minPaymentResult = useMemo(
    () =>
      apr !== null
        ? calculateMinPaymentPayoff(balance, minPayment, apr)
        : null,
    [balance, minPayment, apr]
  )

  if (creditAccounts.length === 0) return null

  if (apr === null) {
    return (
      <Card className="border-border/40">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Interest rate not available — connect your account to see payment
            calculations
          </p>
        </CardContent>
      </Card>
    )
  }

  const canCompareMin =
    minPayment > 0 &&
    result && minPaymentResult &&
    !result.warning && !minPaymentResult.warning &&
    minPaymentResult.months > 0 && isFinite(minPaymentResult.months)
  const timeSaved = canCompareMin ? minPaymentResult.months - result.months : 0
  const moneySaved = canCompareMin ? minPaymentResult.totalInterest - result.totalInterest : 0

  return (
    <Card className="border-border/40">
      <CardContent className="pt-6 space-y-5">
        {/* Card selector */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Account
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => {
              setSelectedAccountId(e.target.value)
              setSliderValue([0])
            }}
            className="w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm"
          >
            {creditAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name ?? a.official_name ?? "Account"} (
                {formatCurrency(a.balance_current ?? 0)})
              </option>
            ))}
          </select>
        </div>

        {/* Interest rate (read-only) */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Interest Rate (APR)</span>
          <span className="font-medium">{apr}%</span>
        </div>

        {/* Monthly payment slider */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Monthly Payment</span>
            <span className="text-cyan-400 font-medium text-sm">
              {formatCurrency(effectivePayment)}
            </span>
          </div>
          <Slider
            value={[effectivePayment]}
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            onValueChange={(v) => setSliderValue(Array.isArray(v) ? v : [v])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatCurrency(sliderMin)}</span>
            <span>{formatCurrency(sliderMax)}</span>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="rounded-lg bg-muted/30 p-4 space-y-3">
            {result.warning ? (
              <p className="text-sm text-red-400">{result.warning}</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Months to Payoff
                    </p>
                    <p className="text-lg font-semibold">{result.months}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(result.totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total Interest
                    </p>
                    <p className="text-lg font-semibold text-amber-400">
                      {formatCurrency(result.totalInterest)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Monthly Payment
                    </p>
                    <p className="text-lg font-semibold text-cyan-400">
                      {formatCurrency(result.monthlyPayment)}
                    </p>
                  </div>
                </div>

                {timeSaved > 0 && (
                  <div className="border-t border-border/40 pt-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      vs. Minimum Payments
                    </p>
                    <p className="text-sm text-green-400">
                      Save {formatCurrency(moneySaved)} in interest and pay off{" "}
                      {timeSaved} months sooner
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PaymentCalculator
