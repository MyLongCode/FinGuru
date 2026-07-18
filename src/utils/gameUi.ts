export function isValidMoneyAmount(amount: number, maximum: number): boolean {
  return Number.isInteger(amount) && amount >= 1 && amount <= maximum
}

export function buildCellPath(start: number, steps: number, trackSize: number): number[] {
  if (!Number.isInteger(steps) || steps <= 0 || !Number.isInteger(trackSize) || trackSize <= 0) {
    return []
  }

  return Array.from({ length: steps }, (_, index) => (start + index + 1) % trackSize)
}

export function sortHistoryByTurn<T extends { turnNumber: number; timestamp: string }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => right.turnNumber - left.turnNumber
    || new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
}
