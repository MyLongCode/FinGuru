export function isValidMoneyAmount(amount: number, maximum: number): boolean {
  return Number.isInteger(amount) && amount >= 1 && amount <= maximum
}

export function buildCellPath(start: number, steps: number, trackSize: number): number[] {
  if (!Number.isInteger(steps) || steps <= 0 || !Number.isInteger(trackSize) || trackSize <= 0) {
    return []
  }

  return Array.from({ length: steps }, (_, index) => (start + index + 1) % trackSize)
}

export function getBigCircleDreamCell(dreamId: number): number {
  if (!Number.isFinite(dreamId)) return 0

  return Math.min(47, Math.max(0, Math.floor(dreamId) - 1))
}

export function getForwardTrackDistance(current: number, target: number, trackSize: number): number {
  if (!Number.isInteger(trackSize) || trackSize <= 0) return 0

  const normalizedCurrent = ((Math.floor(current) % trackSize) + trackSize) % trackSize
  const normalizedTarget = ((Math.floor(target) % trackSize) + trackSize) % trackSize
  return (normalizedTarget - normalizedCurrent + trackSize) % trackSize
}

export function sortHistoryByTurn<T extends { turnNumber: number; timestamp: string }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => right.turnNumber - left.turnNumber
    || new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
}

export interface BankLoanLike {
  liabilityType: string
  balance: number
  payment: number
}

export interface BankCreditProjection {
  maximum: number
  existingBalance: number
  previousPayment: number
  combinedPayment: number
  projectedCashFlow: number
}

export function getBankCreditProjection(
  income: number,
  expenses: number,
  liabilities: BankLoanLike[] = [],
  amount = 0,
): BankCreditProjection {
  const bankLoans = liabilities.filter(liability => liability.liabilityType === 'bankLoan')
  const existingBalance = bankLoans.reduce((sum, liability) => sum + Math.max(0, liability.balance || 0), 0)
  const previousPayment = bankLoans.reduce((sum, liability) => sum + Math.max(0, liability.payment || 0), 0)
  const maximumCombinedPayment = Math.max(0, income - expenses + previousPayment)
  const maximum = Math.max(0, Math.floor(maximumCombinedPayment * 10 - existingBalance))
  const safeAmount = Math.max(0, Math.floor(amount))
  const combinedPayment = existingBalance + safeAmount > 0
    ? Math.ceil((existingBalance + safeAmount) * 0.1)
    : 0
  const projectedExpenses = Math.max(0, expenses - previousPayment + combinedPayment)

  return {
    maximum,
    existingBalance,
    previousPayment,
    combinedPayment,
    projectedCashFlow: income - projectedExpenses,
  }
}

export function formatRollResult(
  diceValues: number[],
  total: number,
  eventTitle?: string,
  sectorLabel?: string,
): string {
  const title = eventTitle?.trim() || sectorLabel?.trim() || 'Событие'
  return diceValues.length > 0 ? `${diceValues.join('+')}=${total} | ${title}` : title
}

export type SpeedTrackTone = 'pink' | 'green' | 'orange' | 'purple'

export function getSpeedTrackTone(type: string, dealType = ''): SpeedTrackTone {
  const value = `${type} ${dealType}`.toLowerCase()
  if (value.includes('dream') || value.includes('мечт')) return 'pink'
  if (value.includes('business') || value.includes('risk') || value.includes('бизнес') || value.includes('риск')) return 'green'
  if (value.includes('expense') || value.includes('расход')) return 'purple'
  return 'orange'
}

export function getTwoLineSpeedTrackTitle(title: string, maxLength = 24): [string, string] {
  const clean = title.replace(/\s+/g, ' ').trim()
  if (!clean) return ['', '']
  const shortened = clean.length > maxLength ? `${clean.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…` : clean
  const words = shortened.split(' ')
  if (words.length === 1) return [shortened, '']

  let split = 1
  let bestDifference = Number.POSITIVE_INFINITY
  for (let index = 1; index < words.length; index++) {
    const first = words.slice(0, index).join(' ')
    const second = words.slice(index).join(' ')
    const difference = Math.abs(first.length - second.length)
    if (difference < bestDifference) {
      split = index
      bestDifference = difference
    }
  }
  return [words.slice(0, split).join(' '), words.slice(split).join(' ')]
}
