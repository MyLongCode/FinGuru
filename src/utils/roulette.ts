export function normalizeCarouselIndex(index: number, itemCount: number): number {
  if (itemCount <= 0) return 0
  return ((Math.trunc(index) % itemCount) + itemCount) % itemCount
}

export function getRouletteTravelCards(currentIndex: number, targetIndex: number, itemCount: number): number {
  if (itemCount <= 0) return 0
  const current = normalizeCarouselIndex(currentIndex, itemCount)
  const target = normalizeCarouselIndex(targetIndex, itemCount)
  const forwardDistance = normalizeCarouselIndex(target - current, itemCount)
  return itemCount + forwardDistance
}

export function createRoulettePlan(
  currentIndex: number,
  targetIndex: number,
  itemCount: number,
  reduceMotion: boolean,
) {
  return {
    targetIndex: normalizeCarouselIndex(targetIndex, itemCount),
    travelCards: reduceMotion ? 0 : getRouletteTravelCards(currentIndex, targetIndex, itemCount),
  }
}
