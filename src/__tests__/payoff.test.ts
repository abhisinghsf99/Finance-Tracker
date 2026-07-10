import { describe, it, expect } from "vitest"
import { calculatePayoff } from "@/lib/payoff"

describe("calculatePayoff", () => {
  it("pays off in one month with zero interest when payment equals the balance", () => {
    const r = calculatePayoff(65262, 65262, 3.625)
    expect(r.months).toBe(1)
    expect(r.totalInterest).toBe(0)
    expect(r.totalPaid).toBe(65262)
    expect(r.monthlyPayment).toBe(65262)
  })

  it("pays off in one month with zero interest when payment exceeds the balance", () => {
    const r = calculatePayoff(65262, 70000, 3.625)
    expect(r.months).toBe(1)
    expect(r.totalInterest).toBe(0)
    // Never pay more than the balance
    expect(r.totalPaid).toBe(65262)
  })

  it("regression: a payment one step short of the balance takes two months and accrues interest", () => {
    // This is the pre-fix slider value from the screenshot ($65,224 on a
    // $65,262 balance). The fix lives in the component, which now snaps this to
    // the full balance — but the math itself must still behave correctly for a
    // genuine just-under-balance payment.
    const r = calculatePayoff(65262, 65224, 3.625)
    expect(r.months).toBe(2)
    expect(r.totalInterest).toBeGreaterThan(0)
    expect(r.totalInterest).toBeCloseTo(197.86, 1)
  })

  it("handles a zero-interest loan by dividing balance across payments", () => {
    const r = calculatePayoff(1200, 100, 0)
    expect(r.months).toBe(12)
    expect(r.totalInterest).toBe(0)
    expect(r.totalPaid).toBe(1200)
  })

  it("warns when the payment does not cover monthly interest", () => {
    // 24% APR on 10000 = ~$200/mo interest; a $150 payment never catches up.
    const r = calculatePayoff(10000, 150, 24)
    expect(r.warning).toMatch(/doesn't cover interest/)
    expect(r.months).toBe(0)
  })

  it("accrues interest across many months for a small payment", () => {
    const r = calculatePayoff(10000, 300, 18)
    expect(r.months).toBeGreaterThan(1)
    expect(r.totalInterest).toBeGreaterThan(0)
    expect(r.totalPaid).toBeCloseTo(10000 + r.totalInterest, 2)
  })

  it("returns an empty result for a non-positive balance", () => {
    const r = calculatePayoff(0, 500, 20)
    expect(r).toEqual({
      monthlyPayment: 500,
      totalPaid: 0,
      totalInterest: 0,
      months: 0,
      warning: null,
    })
  })

  it("caps runaway amortization at maxMonths", () => {
    // Payment barely above interest — would take a very long time; cap at 360.
    const r = calculatePayoff(100000, 400, 4.5, 360)
    expect(r.months).toBeLessThanOrEqual(360)
  })
})
