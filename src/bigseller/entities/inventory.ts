/** One warehouse SKU from BigSeller inventory */
export class InventoryItem {
  sku: string
  title: string
  category: string | null
  warehouse: string | null
  onHand: number
  /** Reserved by open orders */
  allocated: number
  /** Sellable quantity */
  available: number
  onTheWay: number
  /** Weighted average unit cost, THB; 0 = unknown */
  cost: number
  /** onHand × cost, THB */
  totalCost: number
  /** BigSeller's forecast of units sold per day; 0 when it has none */
  avgDailySales: number
}

export class InventoryList {
  /** SKU count reported by BigSeller */
  total: number
  items: InventoryItem[]
}
