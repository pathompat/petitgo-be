export const LISTING_PLATFORMS = ['shopee', 'lazada', 'tiktok'] as const
export type ListingPlatform = (typeof LISTING_PLATFORMS)[number]

/** One variation (seller SKU) of an active marketplace listing */
export class Listing {
  platform: ListingPlatform
  shopName: string | null
  /** THB for the Thai shops; Shopee also lists cross-border shops (MYR, PHP) */
  currency: string | null
  productId: string
  productName: string
  sku: string
  /** Price before promotion */
  listPrice: number
  /** Price the buyer sees now (promotion/special price when set) */
  sellingPrice: number
  stock: number
}

export class ListingList {
  platform: ListingPlatform
  /** Product count reported by BigSeller (variations are flattened into items) */
  total: number
  items: Listing[]
}
