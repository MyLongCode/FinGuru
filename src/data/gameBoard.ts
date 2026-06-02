export interface SectorConfig {
  label: string
  color: string
}

export const SECTOR_COLORS = {
  other: '#FF355C',
  shop: '#077CFF',
  salary: '#FF9705',
  deal: '#34C759',
  event: '#FF36C8',
  negative: '#606060'
} as const

export const sectors: SectorConfig[] = [
  {label: 'Крупная/Мелкая Сделка', color: SECTOR_COLORS.deal},
  {label: 'Зарплата', color: SECTOR_COLORS.salary},
  {label: 'Рынок', color: SECTOR_COLORS.shop},
  {label: 'Всячина', color: SECTOR_COLORS.other},
  {label: 'Ребёнок', color: SECTOR_COLORS.event},
  {label: 'Увольнение', color: SECTOR_COLORS.negative},
  {label: 'Дивиденды', color: SECTOR_COLORS.salary},
  {label: 'Благотворительность', color: SECTOR_COLORS.other},
]

export const SECTOR_COUNT = 36

export const sectorColorMap: Record<string, string> = Object.fromEntries(
  sectors.map(s => [s.label, s.color])
)

export function getSectorByLabel(label: string): SectorConfig | undefined {
  return sectors.find(s => s.label === label)
}
