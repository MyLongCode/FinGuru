import { useCallback, useRef, useState, type ReactNode } from 'react'
import styles from './DealSelectionModal.module.css'
import smallDealSvg from './deal-small.svg'
import bigDealSvg from './deal-big.svg'

interface DealSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: 'small' | 'big') => void
}

export default function DealSelectionModal({ isOpen, onClose, onSelect }: DealSelectionModalProps): ReactNode {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return

    const scrollLeft = carouselRef.current.scrollLeft
    const cardWidth = 378
    const index = Math.round(scrollLeft / cardWidth)
    if (index !== activeIndex) setActiveIndex(index)
  }, [activeIndex])

  if (!isOpen) return null

  const scrollTo = (index: number) => {
    if (!carouselRef.current) return

    const cards = carouselRef.current.children
    if (cards[index]) {
      ;(cards[index] as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center' })
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.carousel} ref={carouselRef} onScroll={handleScroll}>
          <div className={`${styles.card} ${styles.cardSmall}`}>
            <div className={styles.iconArea}>
              <div className={styles.glow} />
              <img className={styles.iconSmall} src={smallDealSvg} alt="" />
            </div>
            <div className={styles.textArea}>
              <h2 className={styles.title}>Мелкая сделка</h2>
              <p className={styles.description}>Нужно мало денег, но и пассивный доход меньше</p>
            </div>
            <button className={styles.button} type="button" onClick={() => onSelect('small')}>
              Выбрать
            </button>
          </div>

          <div className={`${styles.card} ${styles.cardBig}`}>
            <div className={styles.iconArea}>
              <div className={styles.glow} />
              <img className={styles.iconBig} src={bigDealSvg} alt="" />
            </div>
            <div className={styles.textArea}>
              <h2 className={styles.title}>Крупная сделка</h2>
              <p className={styles.description}>Нужно много денег (от 6 000 ₽), но пассивный доход высокий</p>
            </div>
            <button className={styles.button} type="button" onClick={() => onSelect('big')}>
              Выбрать
            </button>
          </div>
        </div>

        <div className={styles.dots}>
          <button
            className={`${styles.dot} ${activeIndex === 0 ? styles.dotActive : ''}`}
            type="button"
            aria-label="Мелкая сделка"
            onClick={() => scrollTo(0)}
          />
          <button
            className={`${styles.dot} ${activeIndex === 1 ? styles.dotActive : ''}`}
            type="button"
            aria-label="Крупная сделка"
            onClick={() => scrollTo(1)}
          />
        </div>
      </div>
    </div>
  )
}
