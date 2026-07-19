import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import styles from './TopBar.module.css'
import { bigSectors, type SectorConfig } from '../data/gameBoard'
import { createRoulettePlan, normalizeCarouselIndex } from '../utils/roulette'

export const grads = {
  pink: 'linear-gradient(90deg, #FF5BA7 0%, #D94BCE 100%)',
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

export interface TopBarSpinRequest {
  id: string
  targetIndex: number
  durationMs?: number
}

export interface TopBarProps {
  items?: TopBarItem[]
  sectors?: SectorConfig[]
  dreams?: TopBarDreams
  players?: TopBarPlayers
  initialIndex?: number
  infinite?: boolean
  spinRequest?: TopBarSpinRequest | null
  onActiveIndexChange?: (index: number) => void
  onSpinComplete?: (requestId: string) => void
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
const DEFAULT_DREAM_COLOR = '#30B0C7'
const DEFAULT_PLAYER_COLOR = '#32ADE6'

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

const Card = memo(function Card({ item }: { item: TopBarItem }) {
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
})

const DreamIcon = memo(function DreamIcon({ dream }: { dream: TopBarDream }) {
  const color = dream.color ?? DEFAULT_DREAM_COLOR
  return <div className={styles.dreamIcon} style={{ borderColor: color }} />
})

const DreamMarker = memo(function DreamMarker({ dream }: { dream: TopBarDream }) {
  const color = dream.color ?? DEFAULT_DREAM_COLOR
  const bgColor = hexToRgba(color, 0.1)
  return (
    <div className={styles.dreamDesktop}>
      <div className={styles.dreamBg} style={{ backgroundColor: bgColor }} />
      <div className={styles.dreamMarker}>
        <div className={styles.dreamRing} style={{ borderColor: color }} />
        <span className={styles.dreamLabel}>МЕЧТА ИГРОКА</span>
        <span className={styles.dreamName} style={{ color }}>{dream.playerName}</span>
      </div>
    </div>
  )
})

const PlayerIcon = memo(function PlayerIcon({ player }: { player: TopBarPlayer }) {
  const bg = player.color ?? DEFAULT_PLAYER_COLOR
  const initial = player.name.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className={styles.playerIcon} style={{ background: bg }}>
      <span className={styles.playerIconLetter}>{initial}</span>
    </div>
  )
})

const PlayerAvatar = memo(function PlayerAvatar({ player }: { player: TopBarPlayer }) {
  const bg = player.color ?? DEFAULT_PLAYER_COLOR
  return (
    <div className={styles.playerAvatar} style={{ background: bg }}>
      <span className={styles.playerName}>{player.name}</span>
    </div>
  )
})

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
  spinRequest,
  onActiveIndexChange,
  onSpinComplete,
}: TopBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const activeIndexRef = useRef<number>(-1)
  const rafRef = useRef<number | null>(null)
  const boundaryTimerRef = useRef<number | null>(null)
  const spinRafRef = useRef<number | null>(null)
  const isSpinningRef = useRef(false)
  const processedSpinIdRef = useRef<string | null>(null)
  const callbackRef = useRef(onActiveIndexChange)
  const spinCompleteRef = useRef(onSpinComplete)
  const layoutRef = useRef<LayoutMetrics | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)

  useEffect(() => {
    callbackRef.current = onActiveIndexChange
  }, [onActiveIndexChange])

  useEffect(() => {
    spinCompleteRef.current = onSpinComplete
  }, [onSpinComplete])

  const finalItems = useMemo(
    () => buildTopBarItems(items, sectors, dreams, players),
    [items, sectors, dreams, players],
  )
  const N = finalItems.length
  const safeInitialIndex = N > 0 ? ((Math.trunc(initialIndex) % N) + N) % N : 0
  const copies = infinite && N > 0 ? COPIES : 1
  const renderedItems = useMemo<TopBarItem[]>(() => {
    const arr: TopBarItem[] = []
    for (let c = 0; c < copies; c++) {
      for (let i = 0; i < N; i++) {
        arr.push(finalItems[i])
      }
    }
    return arr
  }, [finalItems, copies, N])

  const setItemRef = useCallback((i: number) => (el: HTMLDivElement | null) => {
    itemRefs.current[i] = el
  }, [])

  const measureLayout = (): LayoutMetrics | null => {
    const container = containerRef.current
    const first = itemRefs.current[0]
    const second = itemRefs.current[1]
    const Nth = itemRefs.current[N]
    if (!container || !first) return null
    const gap = Number.parseFloat(window.getComputedStyle(container).columnGap || '0') || 0
    const stride = second ? second.offsetLeft - first.offsetLeft : first.offsetWidth + gap
    const blockWidth = Nth ? Nth.offsetLeft - first.offsetLeft : stride * N
    const firstItemCenter = first.offsetLeft + first.offsetWidth / 2
    return { firstItemCenter, stride, blockWidth }
  }

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || N === 0) return
    layoutRef.current = measureLayout()
    const needsInitialPosition = activeIndexRef.current === -1
    if (!needsInitialPosition) return
    activeIndexRef.current = safeInitialIndex
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
      if (isSpinningRef.current) return
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
      if (isSpinningRef.current) return
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

  useEffect(() => {
    const container = containerRef.current
    const layout = layoutRef.current
    if (!spinRequest || !container || !layout || N === 0) return
    if (processedSpinIdRef.current === spinRequest.id) return
    processedSpinIdRef.current = spinRequest.id

    if (spinRafRef.current !== null) {
      cancelAnimationFrame(spinRafRef.current)
      spinRafRef.current = null
    }
    if (boundaryTimerRef.current !== null) {
      window.clearTimeout(boundaryTimerRef.current)
      boundaryTimerRef.current = null
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fallbackIndex = activeIndexRef.current >= 0 ? activeIndexRef.current : 0
    const roulettePlan = createRoulettePlan(
      fallbackIndex,
      spinRequest.targetIndex,
      N,
      reduceMotion,
    )
    const targetIndex = roulettePlan.targetIndex
    let completed = false
    const currentIndex = normalizeCarouselIndex(fallbackIndex, N)
    const centerRenderedIndex = (renderedIndex: number) => (
      layout.firstItemCenter + renderedIndex * layout.stride - container.clientWidth / 2
    )
    const reportIndex = (logicalIndex: number) => {
      const normalized = normalizeCarouselIndex(logicalIndex, N)
      if (activeIndexRef.current !== normalized) {
        activeIndexRef.current = normalized
        callbackRef.current?.(normalized)
      }
    }
    const finish = () => {
      completed = true
      const normalizedRenderedIndex = infinite ? N + targetIndex : targetIndex
      container.scrollLeft = centerRenderedIndex(normalizedRenderedIndex)
      reportIndex(targetIndex)
      isSpinningRef.current = false
      setIsSpinning(false)
      spinCompleteRef.current?.(spinRequest.id)
    }

    if (reduceMotion || !infinite) {
      finish()
      return
    }

    const travelCards = roulettePlan.travelCards
    const startLeft = centerRenderedIndex(currentIndex)
    const endLeft = centerRenderedIndex(currentIndex + travelCards)
    const duration = Math.max(600, spinRequest.durationMs ?? 1800)
    const startedAt = performance.now()
    container.scrollLeft = startLeft
    isSpinningRef.current = true
    setIsSpinning(true)

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 4)
      container.scrollLeft = startLeft + (endLeft - startLeft) * eased
      reportIndex(currentIndex + Math.round(travelCards * eased))
      if (progress < 1) {
        spinRafRef.current = requestAnimationFrame(tick)
        return
      }
      spinRafRef.current = null
      finish()
    }

    spinRafRef.current = requestAnimationFrame(tick)
    return () => {
      if (spinRafRef.current !== null) {
        cancelAnimationFrame(spinRafRef.current)
        spinRafRef.current = null
      }
      isSpinningRef.current = false
      if (!completed && processedSpinIdRef.current === spinRequest.id) {
        processedSpinIdRef.current = null
      }
    }
  }, [N, infinite, spinRequest])

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isSpinning ? styles.containerSpinning : ''}`}
      aria-busy={isSpinning}
    >
      {renderedItems.map((item, i) => (
        <div
          ref={setItemRef(i)}
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
