import {
  Injectable,
  ForbiddenException,
  BadGatewayException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Observable, map, catchError, lastValueFrom } from 'rxjs'
import { AxiosResponse } from 'axios'
import { adminDb } from '../firebase'
import { DailySales } from './entities/daily-sales'

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

  constructor(
    private readonly http: HttpService,
    private config: ConfigService,
  ) {}

  async getListProductShopee(): Promise<Observable<AxiosResponse<any[]>>> {
    const params = {
      orderBy: 'create_time',
      desc: 'true',
      searchType: 'productName',
      inquireType: '0',
      shopeeStatus: 'live',
      status: 'active',
      pageNo: '1',
      pageSize: '50',
    }

    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json;charset=UTF-8',
      Cookie: this.config.get<string>('BIGSELLER_COOKIE'),
    }

    return await lastValueFrom(
      this.http
        .get(
          'https://www.bigseller.com/api/v1/product/listing/shopee/active.json',
          { params, headers },
        )
        .pipe(map((res) => res.data?.data?.page?.rows || []))
        .pipe(
          catchError(() => {
            throw new ForbiddenException('API not available')
          }),
        ),
    )
  }

  /**
   * Daily sales totals from the BigSeller dashboard (orderSalesStatistics.json).
   * BigSeller returns the last 30 days keyed by date label, without marketplace
   * breakdown, and publishes a day's figures some time after it ends.
   */
  async getDailySales(date: string): Promise<DailySales> {
    const cookie = await this.getSessionCookie()

    let body: any
    try {
      const res = await lastValueFrom(
        this.http.post(
          'https://www.bigseller.com/api/v1/orderSalesStatistics.json',
          '',
          {
            timeout: 10000,
            headers: {
              Accept: 'application/json, text/plain, */*',
              'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
              Referer: 'https://www.bigseller.com/web/dashboard.htm',
              Cookie: cookie,
            },
          },
        ),
      )
      body = res.data
    } catch (error) {
      this.logger.error(
        `orderSalesStatistics request failed: ${error?.message}`,
      )
      throw new BadGatewayException('BigSeller not available')
    }

    if (body?.code !== 0) {
      // e.g. 2001 when the session cookie has expired
      this.logger.error(`orderSalesStatistics returned code ${body?.code}`)
      throw new BadGatewayException('BigSeller request failed')
    }

    const stats = Array.isArray(body.data) ? body.data[0] : undefined
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
}
