import { useState, type ReactNode } from 'react'
import styles from './GameBoard.module.css'
import centerImage from '../assets/GameBoard.png'
import { sectors, bigSectors, SECTOR_COUNT } from '../data/gameBoard'

const SECTOR_ANGLE = 360 / SECTOR_COUNT
const BIG_SECTOR_COUNT = 48
const BIG_SECTOR_ANGLE = 360 / BIG_SECTOR_COUNT
const CX = 420
const CY = 420
const VIEWBOX = 840
const INNER_SECTOR_RADIUS = 200
const RING_INNER = 200
const RING_OUTER = 250
const OUTER_SECTOR_RADIUS_FULL = 700
const OUTER_SECTOR_RADIUS_BIG = 200
const OUTER_RING_INNER = 710
const OUTER_RING_OUTER = 740
const CENTER_RADIUS = 60

export interface PlayerMarker {
  id: string
  color: string
  letter: string
  cellIndex?: number
  name?: string
}

interface GameBoardProps {
  players?: PlayerMarker[]
  bigSectorPlayers?: PlayerMarker[]
  currentPlayerId?: string
  activeTab?: 'small' | 'big'
  onTabChange?: (tab: 'small' | 'big') => void
  onRollDice?: () => void
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

function Sector({ index, outer }: { index: number; outer?: boolean }) {
  const configArray = outer ? bigSectors : sectors
  const { color, label } = configArray[index % configArray.length]
  const angle = outer ? BIG_SECTOR_ANGLE : SECTOR_ANGLE
  const startAngle = index * angle
  const endAngle = (index + 1) * angle
  const midAngle = (startAngle + endAngle) / 2
  const midRad = ((midAngle - 90) * Math.PI) / 180
  const innerR = outer ? RING_OUTER : CENTER_RADIUS
  const outerR = outer ? OUTER_SECTOR_RADIUS_FULL : INNER_SECTOR_RADIUS

  const labelR = outer
    ? RING_OUTER + (OUTER_SECTOR_RADIUS_FULL - RING_OUTER) * 0.5
    : INNER_SECTOR_RADIUS * 0.72
  const lx = CX + labelR * Math.cos(midRad)
  const ly = CY + labelR * Math.sin(midRad)
  const rotation = midAngle - 90

  return (
    <g>
      <path
        d={outer ? sectorRingPath(startAngle, endAngle, innerR, outerR) : sectorPath(startAngle, endAngle, outerR)}
        fill={color}
      />
      {!outer && (
        <foreignObject
          x={lx - LABEL_WIDTH / 2}
          y={ly - LABEL_HEIGHT / 2}
          width={LABEL_WIDTH}
          height={LABEL_HEIGHT}
          transform={`rotate(${rotation}, ${lx}, ${ly})`}
        >
          <div
            style={{
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
            }}
          >
            {label}
          </div>
        </foreignObject>
      )}
    </g>
  )
}

function InnerBoundaryShadow({ index }: { index: number }) {
  const boundaryAngle = (index + 1) * SECTOR_ANGLE
  const shadowStart = boundaryAngle - 0.5
  const shadowEnd = boundaryAngle
  return (
    <path
      d={sectorPath(shadowStart, shadowEnd, INNER_SECTOR_RADIUS)}
      fill="rgba(0, 0, 0, 0.45)"
    />
  )
}

function InnerBoundaryHighlight({ index }: { index: number }) {
  const highlightAngle = index * SECTOR_ANGLE
  const highlightEnd = highlightAngle + 0.5
  return (
    <path
      d={sectorPath(highlightAngle, highlightEnd, INNER_SECTOR_RADIUS)}
      fill="rgba(255, 255, 255, 0.35)"
    />
  )
}

function OuterBoundaryShadow({ index }: { index: number }) {
  const boundaryAngle = (index + 1) * BIG_SECTOR_ANGLE
  const shadowStart = boundaryAngle - 0.5
  const shadowEnd = boundaryAngle
  return (
    <path
      d={sectorRingPath(shadowStart, shadowEnd, RING_OUTER, OUTER_SECTOR_RADIUS_FULL)}
      fill="rgba(0, 0, 0, 0.45)"
    />
  )
}

function OuterBoundaryHighlight({ index }: { index: number }) {
  const highlightAngle = index * BIG_SECTOR_ANGLE
  const highlightEnd = highlightAngle + 0.5
  return (
    <path
      d={sectorRingPath(highlightAngle, highlightEnd, RING_OUTER, OUTER_SECTOR_RADIUS_FULL)}
      fill="rgba(255, 255, 255, 0.35)"
    />
  )
}

export default function GameBoard({
  players = [],
  bigSectorPlayers = [],
  currentPlayerId,
  activeTab = 'small',
  onTabChange,
  onRollDice,
}: GameBoardProps) {
  const [internalTab, setInternalTab] = useState<'small' | 'big'>('small')
  const tab = onTabChange ? activeTab : internalTab
  const handleTabChange = (t: 'small' | 'big') => {
    if (onTabChange) onTabChange(t)
    else setInternalTab(t)
  }
  const outerScale = tab === 'big' ? OUTER_SECTOR_RADIUS_BIG / OUTER_SECTOR_RADIUS_FULL : 1
  const innerSectorElements: ReactNode[] = []
  const outerSectorElements: ReactNode[] = []
  for (let i = 0; i < SECTOR_COUNT; i++) {
    innerSectorElements.push(
      <Sector key={`in-${i}`} index={i} />
    )
  }
  for (let i = 0; i < BIG_SECTOR_COUNT; i++) {
    outerSectorElements.push(
      <Sector key={`out-${i}`} index={i} outer />
    )
  }

  const SPREAD = 3.5
  const OUTER_MARKER_R = (OUTER_RING_INNER + OUTER_RING_OUTER) / 2

  function renderPlayerMarkers(
    playerList: PlayerMarker[],
    markerR: number,
    sectorAngle: number,
    markerScale = 1,
  ): ReactNode[] {
    const groups = new Map<number, typeof playerList>()
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
              style={{ transition: 'all 0.3s ease' }}
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
          </g>
        )
      }
    }
    return markers
  }

  const innerPlayerMarkers = renderPlayerMarkers(players, (RING_INNER + RING_OUTER) / 2, SECTOR_ANGLE)
  const outerPlayerMarkers = renderPlayerMarkers(bigSectorPlayers, OUTER_MARKER_R, BIG_SECTOR_ANGLE, tab === 'big' ? 2.5 : 1)

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={styles.content}>
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

        <div className={styles.wheelWrapper}>
          <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className={styles.wheelSvg}>
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
                <circle cx={CX} cy={CY} r={CENTER_RADIUS} />
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
              <radialGradient id="innerRevShadowGrad" cx="50%" cy="50%" r="100%">
                <stop offset="36%" stopColor="rgba(0,0,0,0.20)" />
                <stop offset="50%" stopColor="rgba(0,0,0,0.35)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.70)" />
              </radialGradient>
              <radialGradient id="innerShadowGrad" cx="50%" cy="50%" r="50%">
                <stop offset="36%" stopColor="rgba(0,0,0,0.70)" />
                <stop offset="50%" stopColor="rgba(0,0,0,0.35)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.20)" />
              </radialGradient>

            </defs>

            <g
              transform={`translate(${CX}, ${CY}) scale(${outerScale}) translate(${-CX}, ${-CY})`}
              style={{ transition: 'transform 0.4s ease' }}
            >
              {innerSectorElements}

              <circle cx={CX} cy={CY} r={INNER_SECTOR_RADIUS} fill="url(#glareGrad)" pointerEvents="none" />
              {Array.from({ length: SECTOR_COUNT }, (_, i) => (
                <InnerBoundaryShadow key={`ibs-${i}`} index={i} />
              ))}
              {Array.from({ length: SECTOR_COUNT }, (_, i) => (
                <InnerBoundaryHighlight key={`ibh-${i}`} index={i} />
              ))}

              {outerSectorElements}
              <path
                d={ringPath(RING_OUTER, OUTER_SECTOR_RADIUS_FULL)}
                fill="url(#outerFadeGrad)"
              />
              <path
                d={ringPath(RING_OUTER, OUTER_SECTOR_RADIUS_FULL)}
                fill="url(#innerShadowGrad)"
              />
              <path
                d={ringPath(RING_OUTER, OUTER_SECTOR_RADIUS_FULL)}
                fill="url(#innerRevShadowGrad)"
              />

              <path
                d={ringPath(RING_INNER, RING_OUTER)}
                fill="white"
                fillRule="evenodd"
              />

              <circle cx={CX} cy={CY} r={CENTER_RADIUS} fill="url(#centerBgGrad)" />
              <image
                href={centerImage}
                x={CX - CENTER_RADIUS}
                y={CY - CENTER_RADIUS}
                width={CENTER_RADIUS * 2}
                height={CENTER_RADIUS * 2}
                clipPath="url(#centerClip)"
                preserveAspectRatio="xMidYMid slice"
              />
              <circle
                cx={CX}
                cy={CY}
                r={CENTER_RADIUS}
                fill="none"
                stroke="url(#goldGrad)"
                strokeWidth={4.5}
              />
              <circle
                cx={CX}
                cy={CY}
                r={CENTER_RADIUS - 8}
                fill="none"
                stroke="rgba(255, 215, 0, 0.2)"
                strokeWidth={1}
              />

              {innerPlayerMarkers}

              <path
                d={ringPath(OUTER_RING_INNER, OUTER_RING_OUTER)}
                fill="white"
                fillRule="evenodd"
              />

              {outerPlayerMarkers}
            </g>
          </svg>
        </div>

        <div style={{ flex: 1, minHeight: 0 }} />

        <button className={styles.rollButton} onClick={onRollDice}>
          Бросить кубик
        </button>
      </div>
    </div>
  )
}
