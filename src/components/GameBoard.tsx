import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import styles from './GameBoard.module.css'
import centerImage from '../assets/GameBoard.png'
import { sectors, bigSectors, SECTOR_COUNT } from '../data/gameBoard'
import type { SectorConfig } from '../data/gameBoard'
import type { SpeedTrackCell } from '../sdk'
import { getSpeedTrackTone, getTwoLineSpeedTrackTitle } from '../utils/gameUi'
import TopBar, {
  type TopBarDreams,
  type TopBarItem,
  type TopBarPlayers,
  type TopBarSpinRequest,
} from './TopBar'

const SECTOR_ANGLE = 360 / SECTOR_COUNT
const BIG_SECTOR_COUNT = 48
const BIG_SECTOR_ANGLE = 360 / BIG_SECTOR_COUNT
const CX = 420
const CY = 420
const BIG_VIEWBOX = 440
const INNER_SECTOR_RADIUS = 200
const RING_INNER = 200
const RING_OUTER = 250
const OUTER_SECTOR_RADIUS_FULL = 470
const OUTER_SECTOR_RADIUS_BIG = 200
const CENTER_RADIUS = 60
// Figma 1129:40612: 610 px wheel with a 365.497 px centre (59.9% of the wheel).
// The local SVG keeps its existing 840-coordinate origin and scales that
// reference to an 800-unit wheel centred on the same point.
const SMALL_WHEEL_RADIUS = 400
const SMALL_CENTER_RADIUS = SMALL_WHEEL_RADIUS * (365.497 / 610)
const SMALL_LABEL_RADIUS = SMALL_CENTER_RADIUS + (SMALL_WHEEL_RADIUS - SMALL_CENTER_RADIUS) * 0.5
const SMALL_MARKER_RADIUS = SMALL_CENTER_RADIUS + (SMALL_WHEEL_RADIUS - SMALL_CENTER_RADIUS) * 0.76

export interface PlayerMarker {
  id: string
  color: string
  letter: string
  cellIndex?: number
  name?: string
}

export interface DreamMarker {
  cellIndex: number
  playerName: string
  color?: string
}

interface GameBoardProps {
  players?: PlayerMarker[]
  bigSectorPlayers?: PlayerMarker[]
  bigSectorDreams?: DreamMarker[]
  bigTrack?: SpeedTrackCell[]
  currentPlayerId?: string
  isRolling?: boolean
  diceCount?: number
  diceValues?: number[]
  rollButtonLabel?: string
  activeTab?: 'small' | 'big'
  visibleCircle?: 'small' | 'big'
  spinRequest?: TopBarSpinRequest | null
  onTabChange?: (tab: 'small' | 'big') => void
  onRollDice?: () => void
  onSpinComplete?: (requestId: string) => void
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function sectorPath(startAngle: number, endAngle: number, r: number): string {
  const [x1, y1] = polarToCartesian(CX, CY, r, startAngle)
  const [x2, y2] = polarToCartesian(CX, CY, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

function sectorRingPath(startAngle: number, endAngle: number, innerR: number, outerR: number): string {
  const [x1i, y1i] = polarToCartesian(CX, CY, innerR, startAngle)
  const [x2i, y2i] = polarToCartesian(CX, CY, innerR, endAngle)
  const [x1o, y1o] = polarToCartesian(CX, CY, outerR, startAngle)
  const [x2o, y2o] = polarToCartesian(CX, CY, outerR, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${x1i} ${y1i} A ${innerR} ${innerR} 0 ${largeArc} 1 ${x2i} ${y2i} L ${x2o} ${y2o} A ${outerR} ${outerR} 0 ${largeArc} 0 ${x1o} ${y1o} Z`
}

function ringPath(innerR: number, outerR: number): string {
  const [x1o, y1o] = polarToCartesian(CX, CY, outerR, 0)
  const [x2o, y2o] = polarToCartesian(CX, CY, outerR, 180)
  const [x1i, y1i] = polarToCartesian(CX, CY, innerR, 0)
  const [x2i, y2i] = polarToCartesian(CX, CY, innerR, 180)
  return [
    `M ${x1o} ${y1o}`,
    `A ${outerR} ${outerR} 0 1 1 ${x2o} ${y2o}`,
    `A ${outerR} ${outerR} 0 1 1 ${x1o} ${y1o}`,
    `M ${x1i} ${y1i}`,
    `A ${innerR} ${innerR} 0 1 0 ${x2i} ${y2i}`,
    `A ${innerR} ${innerR} 0 1 0 ${x1i} ${y1i}`,
  ].join(' ')
}

const LABEL_WIDTH = 110
const LABEL_HEIGHT = 36
const SPREAD = 3.5

const SECTOR_LABEL_STYLE: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  color: 'white',
  fontSize: '9px',
  fontWeight: 800,
  fontFamily: "'Montserrat Alternates', sans-serif",
  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
  wordWrap: 'break-word',
  overflowWrap: 'break-word',
  lineHeight: 1.2,
}

const PLAYER_CIRCLE_BASE_STYLE: CSSProperties = { transition: 'all 0.3s ease' }

function buildPlayerMarkers(
  playerList: PlayerMarker[],
  markerR: number,
  sectorAngle: number,
  markerScale: number,
  currentPlayerId: string | undefined,
): ReactNode[] {
  const groups = new Map<number, PlayerMarker[]>()
  for (const player of playerList) {
    const key = player.cellIndex ?? -1
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(player)
  }

  const markers: ReactNode[] = []
  for (const [, group] of groups) {
    const baseAngle = group[0].cellIndex != null
      ? group[0].cellIndex * sectorAngle + sectorAngle / 2
      : 0
    const n = group.length

    for (let j = 0; j < n; j++) {
      const offset = n === 1 ? 0 : ((j - (n - 1) / 2) * SPREAD)
      const angle = baseAngle + offset
      const [mx, my] = polarToCartesian(CX, CY, markerR, angle)
      const isActive = group[j].id === currentPlayerId

      markers.push(
        <g key={`${group[j].id}-${markerR}`}>
          <circle
            cx={mx}
            cy={my}
            r={(isActive ? 11 : 10) * markerScale}
            fill={group[j].color}
            stroke="white"
            strokeWidth={(isActive ? 2.5 : 2) * markerScale}
            style={PLAYER_CIRCLE_BASE_STYLE}
          />
          <text
            x={mx}
            y={my}
            fill="white"
            fontSize={(isActive ? 12 : 10) * markerScale}
            fontWeight="800"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Montserrat Alternates', sans-serif"
          >
            {group[j].letter}
          </text>
        </g>,
      )
    }
  }
  return markers
}

const Sector = memo(function Sector({
  index,
  outer,
  outerRadius = OUTER_SECTOR_RADIUS_FULL,
  innerSectorRadius = INNER_SECTOR_RADIUS,
  centerRadius = CENTER_RADIUS,
  innerLabelRadius = INNER_SECTOR_RADIUS * 0.72,
  innerLabelWidth = LABEL_WIDTH,
  innerLabelHeight = LABEL_HEIGHT,
  innerLabelFontSize = 9,
  config,
}: {
  index: number
  outer?: boolean
  outerRadius?: number
  innerSectorRadius?: number
  centerRadius?: number
  innerLabelRadius?: number
  innerLabelWidth?: number
  innerLabelHeight?: number
  innerLabelFontSize?: number
  config?: SectorConfig
}) {
  const configArray = outer ? bigSectors : sectors
  const { color, label } = config ?? configArray[index % configArray.length]
  const angle = outer ? BIG_SECTOR_ANGLE : SECTOR_ANGLE
  const startAngle = index * angle
  const endAngle = (index + 1) * angle
  const midAngle = (startAngle + endAngle) / 2
  const midRad = ((midAngle - 90) * Math.PI) / 180
  const innerR = outer ? RING_OUTER : centerRadius
  const outerR = outer ? outerRadius : innerSectorRadius

  const labelR = outer
    ? RING_OUTER + (outerRadius - RING_OUTER) * 0.5
    : innerLabelRadius
  const lx = CX + labelR * Math.cos(midRad)
  const ly = CY + labelR * Math.sin(midRad)
  const rotation = midAngle - 90
  const [firstLine, secondLine] = getTwoLineSpeedTrackTitle(label)

  return (
    <g>
      <path
        d={outer ? sectorRingPath(startAngle, endAngle, innerR, outerR) : sectorPath(startAngle, endAngle, outerR)}
        fill={!outer ? color : `url(#outer-grad-${color})`}
      />
      {!outer ? (
        <foreignObject
          x={lx - innerLabelWidth / 2}
          y={ly - innerLabelHeight / 2}
          width={innerLabelWidth}
          height={innerLabelHeight}
          transform={`rotate(${rotation}, ${lx}, ${ly})`}
        >
          <div style={{ ...SECTOR_LABEL_STYLE, fontSize: `${innerLabelFontSize}px`, lineHeight: 1.12 }}>
            {label}
          </div>
        </foreignObject>
      ) : (
        <foreignObject
          x={lx - 70}
          y={ly - 22}
          width={140}
          height={44}
          transform={`rotate(${rotation}, ${lx}, ${ly})`}
        >
          <div style={{ ...SECTOR_LABEL_STYLE, fontSize: '18px', lineHeight: 1.05, flexDirection: 'column' }}>
            <span>{firstLine}</span>
            {secondLine && <span>{secondLine}</span>}
          </div>
        </foreignObject>
      )}
    </g>
  )
})

const InnerBoundaryShadow = memo(function InnerBoundaryShadow({ index, radius }: { index: number; radius: number }) {
  const boundaryAngle = (index + 1) * SECTOR_ANGLE
  const shadowStart = boundaryAngle - 0.5
  const shadowEnd = boundaryAngle
  return (
    <path
      d={sectorPath(shadowStart, shadowEnd, radius)}
      fill="rgba(0, 0, 0, 0.45)"
    />
  )
})

const InnerBoundaryHighlight = memo(function InnerBoundaryHighlight({ index, radius }: { index: number; radius: number }) {
  const highlightAngle = index * SECTOR_ANGLE
  const highlightEnd = highlightAngle + 0.5
  return (
    <path
      d={sectorPath(highlightAngle, highlightEnd, radius)}
      fill={"rgba(255, 255, 255, 0.35)"}
    />
  )
})

export default function GameBoard({
  players = [],
  bigSectorPlayers = [],
  bigSectorDreams = [],
  bigTrack = [],
  currentPlayerId,
  isRolling = false,
  diceCount = 2,
  diceValues = [],
  rollButtonLabel,
  activeTab = 'small',
  visibleCircle,
  spinRequest,
  onTabChange,
  onRollDice,
  onSpinComplete,
}: GameBoardProps) {
  const [internalTab, setInternalTab] = useState<'small' | 'big'>('small')
  const [activeIndex, setActiveIndex] = useState(5)
  const [isMobile, setIsMobile] = useState(false)
  const visibleDiceCount = Math.max(1, diceCount, diceValues.length)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  const tab = visibleCircle ?? (onTabChange ? activeTab : internalTab)
  const handleTabChange = useCallback((t: 'small' | 'big') => {
    if (visibleCircle && visibleCircle !== t) return
    if (onTabChange) onTabChange(t)
    else setInternalTab(t)
  }, [onTabChange, visibleCircle])
  const isSmallCircle = tab === 'small'
  const innerSectorRadius = isSmallCircle ? SMALL_WHEEL_RADIUS : INNER_SECTOR_RADIUS
  const centerRadius = isSmallCircle ? SMALL_CENTER_RADIUS : CENTER_RADIUS
  const outerScale = tab === 'big' ? OUTER_SECTOR_RADIUS_BIG / OUTER_SECTOR_RADIUS_FULL : 1
  const outerSectorRadiusFull = OUTER_SECTOR_RADIUS_FULL
  const outerRingInner = outerSectorRadiusFull + 10
  const outerRingOuter = outerSectorRadiusFull + 40
  const outerMarkerR = (outerRingInner + outerRingOuter) / 2
  const innerMarkerR = isSmallCircle ? SMALL_MARKER_RADIUS : (RING_INNER + RING_OUTER) / 2
  const innerMarkerScale = isSmallCircle ? 1.3 : 1
  const outerMarkerScale = tab === 'big' ? 2.5 : 1
  const wheelViewBox = tab === 'big'
    ? `${CX - BIG_VIEWBOX / 2} ${CY - BIG_VIEWBOX / 2} ${BIG_VIEWBOX} ${BIG_VIEWBOX}`
    : `${CX - SMALL_WHEEL_RADIUS} ${CY - SMALL_WHEEL_RADIUS} ${SMALL_WHEEL_RADIUS * 2} ${SMALL_WHEEL_RADIUS * 2}`
  const speedTrackSectors = useMemo<SectorConfig[]>(() => {
    if (bigTrack.length === 0) {
      return Array.from({ length: BIG_SECTOR_COUNT }, (_, index) => bigSectors[index % bigSectors.length])
    }
    const byPosition = new Map(bigTrack.map(cell => [cell.position, cell]))
    return Array.from({ length: BIG_SECTOR_COUNT }, (_, index) => {
      const cell = byPosition.get(index) ?? bigTrack[index]
      return cell
        ? { label: cell.title, color: getSpeedTrackTone(cell.type, cell.dealType) }
        : bigSectors[index % bigSectors.length]
    })
  }, [bigTrack])

  const innerSectorElements = useMemo<ReactNode[]>(
    () => Array.from({ length: SECTOR_COUNT }, (_, i) => (
      <Sector
        key={`in-${i}`}
        index={i}
        innerSectorRadius={innerSectorRadius}
        centerRadius={centerRadius}
        innerLabelRadius={isSmallCircle ? SMALL_LABEL_RADIUS : INNER_SECTOR_RADIUS * 0.72}
        innerLabelWidth={isSmallCircle ? 156 : LABEL_WIDTH}
        innerLabelHeight={isSmallCircle ? 52 : LABEL_HEIGHT}
        innerLabelFontSize={isSmallCircle ? 16 : 9}
      />
    )),
    [centerRadius, innerSectorRadius, isSmallCircle],
  )

  const outerSectorElements = useMemo<ReactNode[]>(
    () => Array.from({ length: BIG_SECTOR_COUNT }, (_, i) => (
      <Sector key={`out-${i}`} index={i} outer outerRadius={outerSectorRadiusFull} config={speedTrackSectors[i]} />
    )),
    [outerSectorRadiusFull, speedTrackSectors],
  )

  const innerPlayerMarkers = useMemo<ReactNode[]>(
    () => buildPlayerMarkers(players, innerMarkerR, SECTOR_ANGLE, innerMarkerScale, currentPlayerId),
    [players, currentPlayerId, innerMarkerR, innerMarkerScale],
  )

  const outerPlayerMarkers = useMemo<ReactNode[]>(
    () => buildPlayerMarkers(bigSectorPlayers, outerMarkerR, BIG_SECTOR_ANGLE, outerMarkerScale, currentPlayerId),
    [bigSectorPlayers, currentPlayerId, outerMarkerR, outerMarkerScale],
  )

  const outerDreamMarkers = useMemo<ReactNode[]>(() => {
    const r = 11 * outerMarkerScale
    const stroke = 3 * outerMarkerScale
    return bigSectorDreams
      .filter((d) => d.cellIndex >= 0)
      .map((dream) => {
        const angle = dream.cellIndex * BIG_SECTOR_ANGLE + BIG_SECTOR_ANGLE / 2
        const [mx, my] = polarToCartesian(CX, CY, outerMarkerR, angle)
        const color = dream.color ?? '#30B0C7'
        return (
          <g key={`dream-${dream.cellIndex}`}>
            <circle
              cx={mx}
              cy={my}
              r={r}
              fill="white"
              stroke={color}
              strokeWidth={stroke}
            />
          </g>
        )
      })
  }, [bigSectorDreams, outerMarkerScale, outerMarkerR])

  const topBarItems = useMemo<TopBarItem[]>(() => {
    if (bigTrack.length === 0) {
      return speedTrackSectors.map(sector => ({
        variant: sector.color === 'pink' ? 'pink' : sector.color === 'purple' ? 'purple' : sector.color === 'orange' ? 'orange' : 'green',
        title: sector.label,
      }))
    }
    const formatMoney = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
    return [...bigTrack]
      .sort((left, right) => left.position - right.position)
      .map(cell => {
        const hasCost = cell.cost > 0
        const hasCashFlow = cell.cashFlow !== 0
        return {
          variant: getSpeedTrackTone(cell.type, cell.dealType),
          title: cell.title,
          label: hasCost && hasCashFlow ? 'Стоимость · поток' : hasCost ? 'Стоимость' : hasCashFlow ? 'Денежный поток' : undefined,
          value: hasCost && hasCashFlow
            ? `${formatMoney(cell.cost)} · ${cell.cashFlow > 0 ? '+' : ''}${formatMoney(cell.cashFlow)}/мес.`
            : hasCost
              ? formatMoney(cell.cost)
              : hasCashFlow
                ? `${cell.cashFlow > 0 ? '+' : ''}${formatMoney(cell.cashFlow)}/мес.`
                : undefined,
        }
      })
  }, [bigTrack, speedTrackSectors])

  const topBarPlayers = useMemo<TopBarPlayers>(() => {
    const result: TopBarPlayers = {}
    for (const player of bigSectorPlayers) {
      if (player.cellIndex == null || player.cellIndex < 0) continue
      result[player.cellIndex] = {
        name: player.name ?? player.letter,
        color: player.color,
      }
    }
    return result
  }, [bigSectorPlayers])

  const topBarDreams = useMemo<TopBarDreams>(() => {
    const result: TopBarDreams = {}
    for (const dream of bigSectorDreams) {
      if (dream.cellIndex < 0) continue
      result[dream.cellIndex] = {
        playerName: dream.playerName,
        color: dream.color,
      }
    }
    return result
  }, [bigSectorDreams])

  const outerOverlay = useMemo<ReactNode[]>(() => {
    if (tab !== 'big') return []
    const highlightRange = isMobile ? 1 : 2
    const highlightStart = (activeIndex - highlightRange + BIG_SECTOR_COUNT) % BIG_SECTOR_COUNT
    const highlightEnd = (activeIndex + highlightRange) % BIG_SECTOR_COUNT
    const isInHighlight = (i: number): boolean =>
      highlightStart <= highlightEnd
        ? i >= highlightStart && i <= highlightEnd
        : i >= highlightStart || i <= highlightEnd
    const darkenElements: ReactNode[] = []
    const highlightBorders: ReactNode[] = []
    for (let i = 0; i < BIG_SECTOR_COUNT; i++) {
      const startAngle = i * BIG_SECTOR_ANGLE
      const endAngle = (i + 1) * BIG_SECTOR_ANGLE
      if (isInHighlight(i)) {
        highlightBorders.push(
          <path
            key={`outer-highlight-${i}`}
            d={sectorRingPath(startAngle, endAngle, RING_OUTER, outerSectorRadiusFull)}
            fill="none"
            stroke="white"
            strokeWidth={4}
          />,
        )
      } else {
        darkenElements.push(
          <path
            key={`outer-darken-${i}`}
            d={sectorRingPath(startAngle, endAngle, RING_OUTER, outerSectorRadiusFull)}
            fill="rgba(0, 0, 0, 0.3)"
          />,
        )
      }
    }
    return [...darkenElements, ...highlightBorders]
  }, [tab, activeIndex, isMobile, outerSectorRadiusFull])

  const transformStyle = useMemo<CSSProperties>(
    () => ({
      transform: `matrix(${outerScale}, 0, 0, ${outerScale}, ${CX * (1 - outerScale)}, ${CY * (1 - outerScale)})`,
      transition: 'transform 0.4s ease',
    }),
    [outerScale],
  )

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={styles.content}>
        {!visibleCircle && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'small' ? styles.tabActive : ''}`}
              onClick={() => handleTabChange('small')}
            >
              Малый круг
            </button>
            <button
              className={`${styles.tab} ${tab === 'big' ? styles.tabActive : ''}`}
              onClick={() => handleTabChange('big')}
            >
              Большой круг
            </button>
          </div>
        )}

        <div className={`${styles.topBarWrapper} ${tab === 'big' ? styles.topBarWrapperVisible : ''}`}>
          <TopBar
            items={topBarItems}
            players={topBarPlayers}
            dreams={topBarDreams}
            initialIndex={bigSectorPlayers[0]?.cellIndex ?? 0}
            spinRequest={spinRequest}
            onActiveIndexChange={setActiveIndex}
            onSpinComplete={onSpinComplete}
          />
        </div>

        <div className={styles.wheelWrapper}>
          <div className={styles.spinLayer}>
          <svg viewBox={wheelViewBox} className={styles.wheelSvg}>
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="25%" stopColor="#FFA500" />
                <stop offset="50%" stopColor="#FF6347" />
                <stop offset="75%" stopColor="#FFA500" />
                <stop offset="100%" stopColor="#FFD700" />
              </linearGradient>
              <linearGradient id="centerBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#D90041" />
                <stop offset="100%" stopColor="#FF9900" />
              </linearGradient>
              <clipPath id="centerClip">
                <circle cx={CX} cy={CY} r={centerRadius} />
              </clipPath>
              <radialGradient id="glareGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="white" stopOpacity="0.2" />
                <stop offset="60%" stopColor="white" stopOpacity="0.04" />
                <stop offset="100%" stopColor="black" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="outerFadeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="36%" stopColor="white" stopOpacity="0.6" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>

              <linearGradient id='outer-grad-green' x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%' stopColor='#40D451' />
                <stop offset='100%' stopColor='#39A7DB' />
              </linearGradient>
              <linearGradient id='outer-grad-pink' x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%' stopColor='#FF6AAE' />
                <stop offset='100%' stopColor='#D94BCE' />
              </linearGradient>
              <linearGradient id='outer-grad-orange' x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%' stopColor='#FFF71A' />
                <stop offset='100%' stopColor='#F6332C' />
              </linearGradient>
              <linearGradient id='outer-grad-red' x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%' stopColor='#F06060' />
                <stop offset='100%' stopColor='#F34F4F' />
              </linearGradient>
              <linearGradient id='outer-grad-purple' x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%' stopColor='#E85CEB' />
                <stop offset='100%' stopColor='#846ED4' />
              </linearGradient>
            </defs>

            <g style={transformStyle}>
              <g>
                {innerSectorElements}

                <circle cx={CX} cy={CY} r={innerSectorRadius} fill="url(#glareGrad)" pointerEvents="none" />
                {Array.from({ length: SECTOR_COUNT }, (_, i) => (
                  <InnerBoundaryShadow key={`ibs-${i}`} index={i} radius={innerSectorRadius} />
                ))}
                {Array.from({ length: SECTOR_COUNT }, (_, i) => (
                  <InnerBoundaryHighlight key={`ibh-${i}`} index={i} radius={innerSectorRadius} />
                ))}

                {tab === 'big' && (
                  <>
                    <path
                      d={ringPath(RING_INNER, RING_OUTER)}
                      fill="white"
                      fillRule="evenodd"
                    />
                    {outerSectorElements}
                    <path
                      d={ringPath(RING_OUTER, outerSectorRadiusFull)}
                      fill="url(#outerFadeGrad)"
                    />
                    {outerOverlay}
                    <path
                      d={ringPath(outerRingInner, outerRingOuter)}
                      fill="white"
                      fillRule="evenodd"
                    />
                  </>
                )}
                {tab === 'small' && (
                  <path
                    d={ringPath(centerRadius, innerSectorRadius)}
                    fill="url(#outerFadeGrad)"
                    opacity={0.18}
                  />
                )}
              </g>

              <circle cx={CX} cy={CY} r={centerRadius} fill="url(#centerBgGrad)" />
              <image
                href={centerImage}
                x={CX - centerRadius}
                y={CY - centerRadius}
                width={centerRadius * 2}
                height={centerRadius * 2}
                clipPath="url(#centerClip)"
                preserveAspectRatio="xMidYMid slice"
              />
              <circle
                cx={CX}
                cy={CY}
                r={centerRadius}
                fill="none"
                stroke="url(#goldGrad)"
                strokeWidth={isSmallCircle ? 16 : 4.5}
              />
              <circle
                cx={CX}
                cy={CY}
                r={centerRadius - (isSmallCircle ? 22 : 8)}
                fill="none"
                stroke="rgba(255, 215, 0, 0.2)"
                strokeWidth={isSmallCircle ? 3 : 1}
              />

              {innerPlayerMarkers}

              {tab === 'big' && outerPlayerMarkers}
              {tab === 'big' && outerDreamMarkers}
            </g>
          </svg>
          </div>
        </div>

        <div className={styles.diceDock}>
          <div className={styles.diceTray} aria-live="polite">
            {Array.from({ length: visibleDiceCount }, (_, index) => (
              <Die
                key={index}
                value={diceValues[index] ?? ((index % 6) + 1)}
                rolling={isRolling}
                delay={index * 110}
              />
            ))}
          </div>

          <button className={styles.rollButton} onClick={onRollDice} disabled={!onRollDice || isRolling}>
            {rollButtonLabel ?? (isRolling ? 'Бросаем...' : 'Бросить кубики')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Die({ value, rolling, delay }: { value: number; rolling: boolean; delay: number }) {
  const pips = getPips(Math.max(1, Math.min(6, value)))

  return (
    <div
      className={`${styles.die} ${rolling ? styles.dieRolling : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {pips.map(position => (
        <span key={position} className={`${styles.pip} ${styles[`pip${position}` as keyof typeof styles]}`} />
      ))}
    </div>
  )
}

function getPips(value: number): number[] {
  switch (value) {
    case 1: return [5]
    case 2: return [1, 9]
    case 3: return [1, 5, 9]
    case 4: return [1, 3, 7, 9]
    case 5: return [1, 3, 5, 7, 9]
    case 6: return [1, 3, 4, 6, 7, 9]
    default: return [5]
  }
}
