export class DailySales {
  /** YYYY-MM-DD */
  date: string
  /** false when BigSeller has not published figures for this date (yet) */
  available: boolean
  orderCount?: number
  /** THB */
  amount?: number
}
