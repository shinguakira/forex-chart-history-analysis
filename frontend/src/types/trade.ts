export interface Trade {
  pairId: string
  direction: 'bull' | 'bear'
  openPrice: number
  closePrice: number
  size: number
  pl: number
  openDate: string
  closeDate: string
  ref: string
  isFavorite: boolean
}
