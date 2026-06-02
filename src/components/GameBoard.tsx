import type { ReactNode } from 'react'
import styles from './GameBoard.module.css'
import centerImage from '../assets/GameBoard.png'
import { sectors, SECTOR_COUNT } from '../data/gameBoard'

const SECTOR_ANGLE = 360 / SECTOR_COUNT
const CX = 310
const CY = 310
const VIEWBOX = 620
const SECTOR_RADIUS = 258
const RING_INNER = 258
const RING_OUTER = 278
const CENTER_RADIUS = 70

export interface PlayerMarker {
  id: string
  color: string
  letter: string
  cellIndex?: number
  name?: string
}

interface GameBoardProps {
  players?: PlayerMarker[]
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

function Sector({ index }: { index: number }) {
  const { color, label } = sectors[index % sectors.length]
  const startAngle = index * SECTOR_ANGLE
  const endAngle = (index + 1) * SECTOR_ANGLE
  const midAngle = (startAngle + endAngle) / 2
  const midRad = ((midAngle - 90) * Math.PI) / 180
  const labelR = SECTOR_RADIUS * 0.78
  const lx = CX + labelR * Math.cos(midRad)
  const ly = CY + labelR * Math.sin(midRad)
  const rotation = midAngle - 90

  return (
    <g>
      <path
        d={sectorPath(startAngle, endAngle, SECTOR_RADIUS)}
        fill={color}
        stroke="white"
        strokeWidth={1.5}
      />
      <text
        x={lx}
        y={ly}
        transform={`rotate(${rotation}, ${lx}, ${ly})`}
        fill="white"
        fontSize="9"
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Montserrat Alternates', sans-serif"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
      >
        {label}
      </text>
    </g>
  )
}

export default function GameBoard({
  players = [],
  currentPlayerId,
  activeTab = 'small',
  onTabChange,
  onRollDice,
}: GameBoardProps) {
  const sectorElements: ReactNode[] = []
  for (let i = 0; i < SECTOR_COUNT; i++) {
    sectorElements.push(<Sector key={i} index={i} />)
  }

  const groups = new Map<number, typeof players>()
  for (const player of players) {
    const key = player.cellIndex ?? -1
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(player)
  }

  const SPREAD = 3.5
  const playerMarkers: ReactNode[] = []

  for (const [, group] of groups) {
    const baseAngle = group[0].cellIndex != null
      ? group[0].cellIndex * SECTOR_ANGLE + SECTOR_ANGLE / 2
      : 0
    const n = group.length

    for (let j = 0; j < n; j++) {
      const offset = n === 1 ? 0 : ((j - (n - 1) / 2) * SPREAD)
      const angle = baseAngle + offset
      const markerR = (RING_INNER + RING_OUTER) / 2
      const [mx, my] = polarToCartesian(CX, CY, markerR, angle)
      const isActive = group[j].id === currentPlayerId

      playerMarkers.push(
        <g key={group[j].id}>
          <circle
            cx={mx}
            cy={my}
            r={isActive ? 9 : 8}
            fill={group[j].color}
            stroke="white"
            strokeWidth={isActive ? 2.5 : 2}
            style={{ transition: 'all 0.3s ease' }}
          />
          <text
            x={mx}
            y={my}
            fill="white"
            fontSize={isActive ? 10 : 8}
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

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={styles.content}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'small' ? styles.tabActive : ''}`}
            onClick={() => onTabChange?.('small')}
          >
            Малый круг
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'big' ? styles.tabActive : ''}`}
            onClick={() => onTabChange?.('big')}
          >
            Большой круг
          </button>
        </div>

        <div className={styles.centerArea}>
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
            </defs>

            <g filter="url(#wheelShadow)">
              {sectorElements}

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
            </g>

            {playerMarkers}
          </svg>
        </div>
        </div>

        <button className={styles.rollButton} onClick={onRollDice}>
          Бросить кубик
        </button>
      </div>
    </div>
  )
}
