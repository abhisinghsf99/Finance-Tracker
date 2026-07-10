export interface PayoffResult {
  monthlyPayment: number
  totalPaid: number
  totalInterest: number
  months: number
  warning: string | null
}

/**
 * Amortize a balance at a fixed monthly payment.
 *
 * Paying the full balance (or more) in one shot clears it immediately with no
 * interest — the loan is settled before any interest period elapses.
 */
export function calculatePayoff(
  balance: number,
  monthlyPayment: number,
  annualRate: number,
  maxMonths: number = 360
): PayoffResult {
  if (balance <= 0 || monthlyPayment <= 0) {
    return { monthlyPayment, totalPaid: 0, totalInterest: 0, months: 0, warning: null }
  }

  // Pay off in one shot — no interest accrues
  if (monthlyPayment >= balance) {
    return {
      monthlyPayment: balance,
      totalPaid: balance,
      totalInterest: 0,
      months: 1,
      warning: null,
    }
  }

  const monthlyRate = annualRate / 100 / 12

  if (monthlyRate === 0) {
    const months = Math.ceil(balance / monthlyPayment)
    return {
      monthlyPayment,
      totalPaid: balance,
      totalInterest: 0,
      months,
      warning: null,
    }
  }

  let remainingBalance = balance
  let totalPaid = 0
  let totalInterestPaid = 0
  let month = 0

  while (remainingBalance > 0.005 && month < maxMonths) {
    const monthlyInterest = remainingBalance * monthlyRate

    if (monthlyPayment <= monthlyInterest) {
      return {
        monthlyPayment,
        totalPaid: 0,
        totalInterest: 0,
        months: 0,
        warning: "Payment doesn't cover interest — balance will grow",
      }
    }

    // Final payment: pay remaining balance + that month's interest
    const actualPayment = Math.min(monthlyPayment, remainingBalance + monthlyInterest)
    const principal = actualPayment - monthlyInterest

    totalInterestPaid += monthlyInterest
    totalPaid += actualPayment
    remainingBalance -= principal
    month++
  }

  return {
    monthlyPayment,
    totalPaid,
    totalInterest: totalInterestPaid,
    months: month,
    warning: null,
  }
}

export function calculateMinPaymentPayoff(
  balance: number,
  minPayment: number,
  annualRate: number
): PayoffResult {
  return calculatePayoff(balance, minPayment, annualRate)
}
