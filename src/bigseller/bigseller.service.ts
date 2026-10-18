import {
  Injectable,
  BadGatewayException,
  ServiceUnavailableException,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'
import { adminDb } from '../firebase'
import { DailySales } from './entities/daily-sales'
import { CookieDocument } from './entities/cookies'
import { InventoryItem, InventoryList } from './entities/inventory'
import { Listing, ListingList, ListingPlatform } from './entities/listing'

const BIGSELLER_API = 'https://www.bigseller.com/api/v1/'
const INVENTORY_PAGE_SIZE = 500
const LISTING_PAGE_SIZE = 200
/** Guards against a runaway loop if BigSeller misreports totalPage */
const MAX_PAGES = 20

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** BigSeller dashboard date label ("29 Sep 2026") → "2026-09-29"; null if unrecognized */
export function parseBigsellerDateLabel(label: string): string | null {
  const match = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(label.trim())
  if (!match) return null
  const month = MONTHS.indexOf(match[2])
  if (month < 0) return null
  return `${match[3]}-${String(month + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`
}

@Injectable()
export class BigsellerService {
  private readonly logger = new Logger(BigsellerService.name)
  private cookies = adminDb.collection('cookies')

  constructor(private readonly http: HttpService) {}

  /**
   * Daily sales totals from the BigSeller dashboard (orderSalesStatistics.json).
   * BigSeller returns the last 30 days keyed by date label, without marketplace
   * breakdown, and publishes a day's figures some time after it ends.
   */
  async getDailySales(date: string): Promise<DailySales> {
    const data = await this.request('orderSalesStatistics.json', {
      method: 'POST',
      data: '',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Referer: 'https://www.bigseller.com/web/dashboard.htm',
      },
    })

    const stats = Array.isArray(data) ? data[0] : undefined
    if (!stats || typeof stats !== 'object') {
      throw new BadGatewayException('BigSeller returned unexpected data')
    }

    for (const [label, entry] of Object.entries<any>(stats)) {
      if (parseBigsellerDateLabel(label) !== date) continue
      const orderCount = Number(entry?.orderCount)
      const amount = Number(entry?.amount)
      if (!Number.isFinite(orderCount) || !Number.isFinite(amount)) {
        throw new BadGatewayException('BigSeller returned unexpected data')
      }
      return { date, available: true, orderCount, amount }
    }
    return { date, available: false }
  }

  /**
   * Every SKU in the BigSeller warehouse (inventory/pageList.json), all pages.
   * `cost` is the weighted average cost; 0 means BigSeller has no cost for the SKU.
   */
  async getInventory(): Promise<InventoryList> {
    const { total, rows } = await this.fetchAllPages((pageNo) =>
      this.request('inventory/pageList.json', {
        method: 'POST',
        data: new URLSearchParams({
          pageNo: String(pageNo),
          pageSize: String(INVENTORY_PAGE_SIZE),
          searchType: 'skuName',
          orderBy: 'onHand',
          desc: '0',
        }).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      }),
    )
    return { total, items: rows.map(toInventoryItem) }
  }

  /**
   * Active marketplace listings, one item per variation (seller SKU), all pages.
   * Shopee includes the cross-border shops (MYR/PHP), so callers should check `currency`.
   */
  async getListings(platform: ListingPlatform): Promise<ListingList> {
    const { total, rows } = await this.fetchAllPages((pageNo) =>
      this.request(`product/listing/${platform}/pageList.json`, {
        method: 'GET',
        params: {
          ...LISTING_FILTERS[platform],
          orderBy: 'create_time',
          desc: 'true',
          searchType: 'productName',
          inquireType: '0',
          pageNo: String(pageNo),
          pageSize: String(LISTING_PAGE_SIZE),
        },
      }),
    )
    return { platform, total, items: rows.flatMap(LISTING_MAPPERS[platform]) }
  }

  /** Follows BigSeller's `data.page` pagination until the last page */
  private async fetchAllPages(
    fetchPage: (pageNo: number) => Promise<any>,
  ): Promise<{ total: number; rows: any[] }> {
    const rows: any[] = []
    let total = 0
    for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
      const page = (await fetchPage(pageNo))?.page
      if (!page || !Array.isArray(page.rows)) {
        throw new BadGatewayException('BigSeller returned unexpected data')
      }
      rows.push(...page.rows)
      total = Number(page.totalSize) || rows.length
      if (pageNo >= Number(page.totalPage) || page.rows.length === 0) break
    }
    return { total, rows }
  }

  /** Calls a read-only BigSeller endpoint with the stored session; returns `data` */
  private async request(
    path: string,
    options: {
      method: 'GET' | 'POST'
      params?: Record<string, string>
      data?: string
      headers?: Record<string, string>
    },
  ): Promise<any> {
    const cookie = await this.getSessionCookie()
    const url = BIGSELLER_API + path
    const config = {
      timeout: 10000,
      params: options.params,
      headers: {
        Accept: 'application/json, text/plain, */*',
        ...options.headers,
        Cookie: cookie,
      },
    }

    let body: any
    try {
      const res = await lastValueFrom(
        options.method === 'POST'
          ? this.http.post(url, options.data ?? '', config)
          : this.http.get(url, config),
      )
      body = res.data
    } catch (error) {
      this.logger.error(`${path} request failed: ${error?.message}`)
      throw new BadGatewayException('BigSeller not available')
    }

    if (body?.code !== 0) {
      // e.g. 2001 when the session cookie has expired
      this.logger.error(`${path} returned code ${body?.code}`)
      throw new BadGatewayException('BigSeller request failed')
    }
    return body.data
  }

  /** Latest session cookie, kept fresh in Firestore via GET /bigseller/cookie */
  private async getSessionCookie(): Promise<string> {
    const snapshot = await this.cookies.limit(1).get()
    const cookie = snapshot.docs[0]?.data()?.cookie
    if (!cookie) {
      throw new ServiceUnavailableException('BigSeller session not configured')
    }
    return cookie
  }

  async updateCookie(cookie: string, session: string): Promise<boolean> {
    let result = true
    const collection = await this.cookies.get()
    for (const doc of collection.docs) {
      const r = await doc.ref.update({
        cookie: `muc_token=${cookie}; JSESSIONID=${session};`,
        updatedAt: new Date(),
      })
      result = result && !!r.writeTime
    }
    return result
  }

  async listCookies(): Promise<CookieDocument[]> {
    const snapshot = await this.cookies.get()
    return snapshot.docs.map(toCookieDocument)
  }

  /** Overwrites the stored Cookie header as-is (unlike updateCookie, no muc_token/JSESSIONID wrapping) */
  async setCookie(id: string, cookie: string): Promise<CookieDocument> {
    const ref = this.cookies.doc(id)
    const doc = await ref.get()
    if (!doc.exists) {
      throw new NotFoundException(`Cookie document ${id} not found`)
    }
    await ref.update({ cookie: cookie.trim(), updatedAt: new Date() })
    return toCookieDocument(await ref.get())
  }
}

function toCookieDocument(
  doc: FirebaseFirestore.DocumentSnapshot,
): CookieDocument {
  const data = doc.data() ?? {}
  return {
    id: doc.id,
    cookie: data.cookie ?? '',
    updatedAt: toIsoString(data.updatedAt),
    latestNotifiedAt: toIsoString(data.latestNotifiedAt),
  }
}

/** Firestore Timestamp (or Date) → ISO string; null when unset */
function toIsoString(value: any): string | null {
  if (!value) return null
  const date =
    typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  return date.toISOString()
}

/** BigSeller number fields arrive as numbers or strings ("12.50", "--"); unknown → 0 */
function toNumber(value: any): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toInventoryItem(row: any): InventoryItem {
  return {
    sku: String(row.sku ?? ''),
    title: String(row.title ?? ''),
    category: row.classifyName ?? null,
    warehouse: row.warehouseName ?? null,
    onHand: toNumber(row.onhand),
    allocated: toNumber(row.allocated),
    available: toNumber(row.available),
    onTheWay: toNumber(row.onTheWay),
    cost: toNumber(row.cost),
    totalCost: toNumber(row.totalCost),
    avgDailySales: toNumber(row.avgDailySales),
  }
}

/** Query filters each listing page uses in the BigSeller UI for "active" products */
const LISTING_FILTERS: Record<ListingPlatform, Record<string, string>> = {
  shopee: { shopeeStatus: 'live', status: 'active' },
  lazada: { status: 'active', platformStatus: 'active' },
  tiktok: { bsStatus: '4', tiktokStatus: '4', status: 'active' },
}

function listingBase(platform: ListingPlatform, row: any) {
  return {
    platform,
    shopName: row.shopName ?? null,
    currency: row.currency ?? null,
    productId: String(row.itemId ?? row.id ?? ''),
    productName: String(row.name ?? ''),
  }
}

/** Selling price when a promotion/special price is set, else the list price */
function effectivePrice(listPrice: number, ...candidates: any[]): number {
  for (const candidate of candidates) {
    const n = toNumber(candidate)
    if (n > 0) return n
  }
  return listPrice
}

const LISTING_MAPPERS: Record<ListingPlatform, (row: any) => Listing[]> = {
  shopee: (row) => {
    const base = listingBase('shopee', row)
    const variations: any[] = row.variations?.length ? row.variations : [row]
    return variations.map((v) => {
      const sellingPrice = toNumber(v.price)
      return {
        ...base,
        sku: String(v.variationSku ?? v.itemSku ?? ''),
        listPrice: toNumber(v.originalPrice) || sellingPrice,
        sellingPrice,
        stock: toNumber(v.stock),
      }
    })
  },
  // Lazada's status filter is not applied server-side, so drop inactive rows here
  lazada: (row) => {
    if (['inactive', 'deleted'].includes(row.lazadaStatus)) return []
    const base = listingBase('lazada', row)
    return (row.variations ?? [])
      .filter((v: any) => v.status === 'active')
      .map((v: any) => {
        const listPrice = toNumber(v.price)
        return {
          ...base,
          sku: String(v.sellerSku ?? ''),
          listPrice,
          sellingPrice: effectivePrice(listPrice, v.salePrice),
          stock: toNumber(v.quantity),
        }
      })
  },
  tiktok: (row) => {
    const base = listingBase('tiktok', row)
    return (row.variations ?? []).map((v: any) => {
      const listPrice = toNumber(v.originalPrice)
      return {
        ...base,
        currency: base.currency ?? v.currency ?? null,
        sku: String(v.sellerSku ?? ''),
        listPrice,
        sellingPrice: effectivePrice(
          listPrice,
          v.promotionPrice,
          v.salePrice,
          v.price,
        ),
        stock: toNumber(v.stock),
      }
    })
  },
}
