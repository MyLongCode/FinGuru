import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import styles from './TopBar.module.css'
import { bigSectors, type SectorConfig } from '../data/gameBoard'

export const grads = {
  green: 'linear-gradient(90deg, #40D451 0%, #39A7DB 100%)',
  orange: 'linear-gradient(90deg, #FFD31A 0%, #F6332C 100%)',
  purple: 'linear-gradient(90deg, #E85CEB 0%, #846ED4 100%)',
  red: 'linear-gradient(90deg, #F06060 0%, #F34F4F 100%)',
} as const

export type TopBarCardVariant = keyof typeof grads

export interface TopBarDream {
  playerName: string
  color?: string
}

export interface TopBarPlayer {
  name: string
  color?: string
}

export interface TopBarItem {
  variant: TopBarCardVariant
  title: string
  label?: string
  value?: string
  bigTitle?: boolean
  dream?: TopBarDream
  player?: TopBarPlayer
}

export type TopBarDreams = Record<number, TopBarDream | null | undefined>
export type TopBarPlayers = Record<number, TopBarPlayer | null | undefined>

export interface TopBarProps {
  items?: TopBarItem[]
  sectors?: SectorConfig[]
  dreams?: TopBarDreams
  players?: TopBarPlayers
  initialIndex?: number
  infinite?: boolean
  onActiveIndexChange?: (index: number) => void
}

const COPIES = 3
const variantByColorName: Record<string, TopBarCardVariant> = {
  green: 'green',
  orange: 'orange',
  red: 'red',
  purple: 'purple',
}
const DEFAULT_SECTOR_LABEL = 'Стоимость'
const DEFAULT_SECTOR_VALUE = '100 000 ₽'

const hasOwn = (obj: Record<number, unknown> | undefined, key: number): boolean =>
  obj !== undefined && Object.prototype.hasOwnProperty.call(obj, key)

function buildSectorItem(sector: SectorConfig): TopBarItem {
  return {
    variant: variantByColorName[sector.color] ?? 'green',
    title: sector.label,
    label: DEFAULT_SECTOR_LABEL,
    value: DEFAULT_SECTOR_VALUE,
  }
}

export function buildTopBarItems(
  items: TopBarItem[] | undefined,
  sectors: SectorConfig[] | undefined,
  dreams: TopBarDreams | undefined,
  players: TopBarPlayers | undefined,
): TopBarItem[] {
  const baseItems = items ?? (sectors ?? bigSectors).map(buildSectorItem)
  return baseItems.map((item, i) => {
    let merged = item
    if (hasOwn(dreams, i)) {
      merged = { ...merged, dream: dreams![i] ?? undefined }
    }
    if (hasOwn(players, i)) {
      merged = { ...merged, player: players![i] ?? undefined }
    }
    return merged
  })
}

function hexToRgba(hex: string, alpha: number): string {
  const v = hex.replace('#', '')
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function Card({ item }: { item: TopBarItem }) {
  const style: CSSProperties = { background: grads[item.variant] }
  const titleClass = `${styles.title}${item.bigTitle ? ` ${styles.titleBig}` : ''}`
  return (
    <div className={styles.card} style={style}>
      <div className={titleClass}>{item.title}</div>
      {item.label !== undefined && item.value !== undefined && (
        <div className={styles.priceCol}>
          <span className={styles.priceLabel}>{item.label}</span>
          <span className={styles.priceValue}>{item.value}</span>
        </div>
      )}
    </div>
  )
}

function DreamIcon({ dream }: { dream: TopBarDream }) {
  const color = dream.color ?? '#30B0C7'
  return <div className={styles.dreamIcon} style={{ borderColor: color }} />
}

function DreamMarker({ dream }: { dream: TopBarDream }) {
  const color = dream.color ?? '#30B0C7'
  return (
    <div className={styles.dreamDesktop}>
      <div className={styles.dreamBg} style={{ backgroundColor: hexToRgba(color, 0.1) }} />
      <div className={styles.dreamMarker}>
        <div className={styles.dreamRing} style={{ borderColor: color }} />
        <span className={styles.dreamLabel}>МЕЧТА ИГРОКА</span>
        <span className={styles.dreamName} style={{ color }}>{dream.playerName}</span>
      </div>
    </div>
  )
}

function PlayerIcon({ player }: { player: TopBarPlayer }) {
  const bg = player.color ?? '#32ADE6'
  const initial = player.name.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className={styles.playerIcon} style={{ background: bg }}>
      <span className={styles.playerIconLetter}>{initial}</span>
    </div>
  )
}

function PlayerAvatar({ player }: { player: TopBarPlayer }) {
  const bg = player.color ?? '#32ADE6'
  return (
    <div className={styles.playerAvatar} style={{ background: bg }}>
      <span className={styles.playerName}>{player.name}</span>
    </div>
  )
}

interface LayoutMetrics {
  firstItemCenter: number
  stride: number
  blockWidth: number
}

export default function TopBar({
  items,
  sectors,
  dreams,
  players,
  initialIndex = 5,
  infinite = true,
  onActiveIndexChange,
}: TopBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const activeIndexRef = useRef<number>(-1)
  const rafRef = useRef<number | null>(null)
  const boundaryTimerRef = useRef<number | null>(null)
  const callbackRef = useRef(onActiveIndexChange)
  const layoutRef = useRef<LayoutMetrics | null>(null)

  useEffect(() => {
    callbackRef.current = onActiveIndexChange
  }, [onActiveIndexChange])

  const finalItems = useMemo(
    () => buildTopBarItems(items, sectors, dreams, players),
    [items, sectors, dreams, players],
  )
  const N = finalItems.length
  const safeInitialIndex = N > 0 ? ((Math.trunc(initialIndex) % N) + N) % N : 0
  const copies = infinite && N > 0 ? COPIES : 1
  const renderedItems: TopBarItem[] = []
  for (let c = 0; c < copies; c++) {
    for (let i = 0; i < N; i++) {
      renderedItems.push(finalItems[i])
    }
  }

  const measureLayout = (): LayoutMetrics | null => {
    const first = itemRefs.current[0]
    const second = itemRefs.current[1]
    const Nth = itemRefs.current[N]
    if (!first || !second || !Nth) return null
    const stride = second.offsetLeft - first.offsetLeft
    const blockWidth = Nth.offsetLeft - first.offsetLeft
    const firstItemCenter = first.offsetLeft + first.offsetWidth / 2
    return { firstItemCenter, stride, blockWidth }
  }

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || N === 0) return
    layoutRef.current = measureLayout()
    if (activeIndexRef.current === -1) {
      activeIndexRef.current = safeInitialIndex
    }
    if (!infinite) return
    const middleStart = itemRefs.current[N + safeInitialIndex]
    if (middleStart && layoutRef.current) {
      const target = middleStart.offsetLeft + middleStart.offsetWidth / 2 - container.clientWidth / 2
      container.scrollLeft = target
    }
  }, [N, infinite, safeInitialIndex])

  useEffect(() => {
    const container = containerRef.current
    if (!container || N === 0) return

    const findClosestIndex = (): number => {
      const layout = layoutRef.current
      if (!layout) return 0
      const viewportCenter = container.scrollLeft + container.clientWidth / 2
      const raw = (viewportCenter - layout.firstItemCenter) / layout.stride
      return Math.round(raw)
    }

    const reportActive = (renderedIndex: number) => {
      const logicalIndex = ((renderedIndex % N) + N) % N
      if (activeIndexRef.current !== logicalIndex) {
        activeIndexRef.current = logicalIndex
        callbackRef.current?.(logicalIndex)
      }
    }

    const handleBoundary = () => {
      if (!infinite) return
      const layout = layoutRef.current
      if (!layout || layout.blockWidth <= 0) return
      const closestIndex = findClosestIndex()
      if (closestIndex < N) {
        container.scrollLeft += layout.blockWidth
      } else if (closestIndex >= 2 * N) {
        container.scrollLeft -= layout.blockWidth
      }
    }

    const onScroll = () => {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          reportActive(findClosestIndex())
        })
      }
      if (infinite && boundaryTimerRef.current === null) {
        boundaryTimerRef.current = window.setTimeout(() => {
          boundaryTimerRef.current = null
          handleBoundary()
        }, 120)
      }
    }

    const onScrollEnd = () => {
      if (boundaryTimerRef.current !== null) {
        clearTimeout(boundaryTimerRef.current)
        boundaryTimerRef.current = null
      }
      reportActive(findClosestIndex())
      handleBoundary()
    }

    const onResize = () => {
      layoutRef.current = measureLayout()
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    container.addEventListener('scrollend', onScrollEnd)
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(container)
    reportActive(findClosestIndex())

    return () => {
      container.removeEventListener('scroll', onScroll)
      container.removeEventListener('scrollend', onScrollEnd)
      resizeObserver.disconnect()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (boundaryTimerRef.current !== null) {
        clearTimeout(boundaryTimerRef.current)
        boundaryTimerRef.current = null
      }
    }
  }, [N, infinite])

  return (
    <div ref={containerRef} className={styles.container}>
      {renderedItems.map((item, i) => (
        <div
          ref={(el) => {
            itemRefs.current[i] = el
          }}
          className={styles.itemWrapper}
          key={i}
        >
          <div className={styles.iconRow}>
            {item.player && <PlayerIcon player={item.player} />}
            {item.dream && <DreamIcon dream={item.dream} />}
          </div>
          {item.dream && <DreamMarker dream={item.dream} />}
          {item.player && <PlayerAvatar player={item.player} />}
          <Card item={item} />
        </div>
      ))}
    </div>
  )
}
