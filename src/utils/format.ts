export function formatCurrency(amount: number): string {
  if (amount >= 10_000) {
    const thousands = Math.floor(amount / 100) / 10
    const formatted = thousands % 1 === 0 ? `${Math.floor(thousands)}к` : `${thousands.toFixed(1)}к`
    return `${formatted} ₽`
  }

  const sign = amount < 0 ? '- ' : ''
  return `${sign}${Math.abs(amount).toLocaleString('ru-RU')} ₽`
}

export function formatFullCurrency(amount: number): string {
  const normalized = Object.is(amount, -0) ? 0 : amount
  const sign = normalized < 0 ? '- ' : ''
  return `${sign}${Math.abs(normalized).toLocaleString('ru-RU')} ₽`
}
