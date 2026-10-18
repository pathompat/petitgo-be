jest.mock('../firebase')

import { Test, TestingModule } from '@nestjs/testing'
import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { of, throwError } from 'rxjs'
import { adminDb } from '../firebase'
import { BigsellerService, parseBigsellerDateLabel } from './bigseller.service'

const cookiesCollection = adminDb.collection('cookies') as any

const mockCookie = (cookie?: string) => {
  cookiesCollection.limit = jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      docs: cookie ? [{ data: () => ({ cookie }) }] : [],
    }),
  })
}

const statsResponse = (data: unknown, code = 0) =>
  of({ data: { code, msg: 'Successfully', data } })

describe('BigsellerService', () => {
  let service: BigsellerService
  let http: { get: jest.Mock; post: jest.Mock }

  beforeEach(async () => {
    http = { get: jest.fn(), post: jest.fn() }
    const module: TestingModule = await Test.createTestingModule({
      providers: [BigsellerService, { provide: HttpService, useValue: http }],
    }).compile()

    service = module.get<BigsellerService>(BigsellerService)
    mockCookie('muc_token=abc; JSESSIONID=def;')
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getDailySales', () => {
    const stats = [
      {
        '28 Sep 2026': {
          amount: 1200.5,
          amount_str: '1,200.50',
          orderCount: 4,
        },
        '29 Sep 2026': { amount: 0, amount_str: '0.00', orderCount: 0 },
      },
    ]

    it('returns totals for the requested date using the Firestore cookie', async () => {
      http.post.mockReturnValue(statsResponse(stats))

      await expect(service.getDailySales('2026-09-28')).resolves.toEqual({
        date: '2026-09-28',
        available: true,
        orderCount: 4,
        amount: 1200.5,
      })
      const [url, , config] = http.post.mock.calls[0]
      expect(url).toContain('orderSalesStatistics.json')
      expect(config.headers.Cookie).toBe('muc_token=abc; JSESSIONID=def;')
    })

    it('treats a zero-sales day as available', async () => {
      http.post.mockReturnValue(statsResponse(stats))
      await expect(service.getDailySales('2026-09-29')).resolves.toMatchObject({
        available: true,
        orderCount: 0,
        amount: 0,
      })
    })

    it('reports a date BigSeller has not published as unavailable', async () => {
      http.post.mockReturnValue(statsResponse(stats))
      await expect(service.getDailySales('2026-09-30')).resolves.toEqual({
        date: '2026-09-30',
        available: false,
      })
    })

    it('fails with 502 when BigSeller returns an error code (e.g. expired session)', async () => {
      http.post.mockReturnValue(of({ data: { code: 2001, msg: '' } }))
      await expect(service.getDailySales('2026-09-28')).rejects.toBeInstanceOf(
        BadGatewayException,
      )
    })

    it('fails with 502 when BigSeller is unreachable', async () => {
      http.post.mockReturnValue(throwError(() => new Error('timeout')))
      await expect(service.getDailySales('2026-09-28')).rejects.toBeInstanceOf(
        BadGatewayException,
      )
    })

    it('fails with 502 on malformed figures', async () => {
      http.post.mockReturnValue(
        statsResponse([{ '28 Sep 2026': { amount: 'n/a', orderCount: 1 } }]),
      )
      await expect(service.getDailySales('2026-09-28')).rejects.toBeInstanceOf(
        BadGatewayException,
      )
    })

    it('fails with 503 when no session cookie is stored', async () => {
      mockCookie(undefined)
      await expect(service.getDailySales('2026-09-28')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      )
      expect(http.post).not.toHaveBeenCalled()
    })
  })

  describe('getInventory', () => {
    const page = (rows: unknown[], totalPage: number, totalSize: number) =>
      of({ data: { code: 0, data: { page: { totalPage, totalSize, rows } } } })
    const row = (sku: string) => ({
      sku,
      title: `Product ${sku}`,
      classifyName: 'Cat Food',
      warehouseName: 'Default Warehouse',
      onhand: 5,
      allocated: 1,
      available: 4,
      onTheWay: 0,
      cost: '120.50',
      totalCost: '602.50',
      avgDailySales: 0.4,
    })

    it('reads every page and normalizes the rows', async () => {
      http.post
        .mockReturnValueOnce(page([row('A')], 2, 2))
        .mockReturnValueOnce(page([row('B')], 2, 2))

      const result = await service.getInventory()

      expect(result.total).toBe(2)
      expect(result.items.map((i) => i.sku)).toEqual(['A', 'B'])
      expect(result.items[0]).toEqual({
        sku: 'A',
        title: 'Product A',
        category: 'Cat Food',
        warehouse: 'Default Warehouse',
        onHand: 5,
        allocated: 1,
        available: 4,
        onTheWay: 0,
        cost: 120.5,
        totalCost: 602.5,
        avgDailySales: 0.4,
      })
      expect(http.post).toHaveBeenCalledTimes(2)
      const [url, body, config] = http.post.mock.calls[1]
      expect(url).toContain('inventory/pageList.json')
      expect(body).toContain('pageNo=2')
      expect(config.headers.Cookie).toBe('muc_token=abc; JSESSIONID=def;')
    })

    it('fails with 502 on an expired session', async () => {
      http.post.mockReturnValue(of({ data: { code: 2001, msg: '' } }))
      await expect(service.getInventory()).rejects.toBeInstanceOf(
        BadGatewayException,
      )
    })

    it('fails with 502 when the page is missing', async () => {
      http.post.mockReturnValue(of({ data: { code: 0, data: {} } }))
      await expect(service.getInventory()).rejects.toBeInstanceOf(
        BadGatewayException,
      )
    })
  })

  describe('getListings', () => {
    const page = (rows: unknown[]) =>
      of({
        data: {
          code: 0,
          data: { page: { totalPage: 1, totalSize: rows.length, rows } },
        },
      })

    it('flattens Shopee variations with list and current price', async () => {
      http.get.mockReturnValue(
        page([
          {
            itemId: 111,
            name: 'Cat litter',
            shopName: 'PIG Shopee',
            currency: 'THB',
            variations: [
              {
                variationSku: 'KT-20L',
                originalPrice: 600,
                price: 489,
                stock: 6,
              },
            ],
          },
        ]),
      )

      await expect(service.getListings('shopee')).resolves.toEqual({
        platform: 'shopee',
        total: 1,
        items: [
          {
            platform: 'shopee',
            shopName: 'PIG Shopee',
            currency: 'THB',
            productId: '111',
            productName: 'Cat litter',
            sku: 'KT-20L',
            listPrice: 600,
            sellingPrice: 489,
            stock: 6,
          },
        ],
      })
      const [url, config] = http.get.mock.calls[0]
      expect(url).toContain('product/listing/shopee/pageList.json')
      expect(config.params).toMatchObject({ shopeeStatus: 'live', pageNo: '1' })
    })

    it('uses the Lazada special price and drops inactive rows', async () => {
      http.get.mockReturnValue(
        page([
          {
            itemId: '9',
            name: 'Wet food',
            lazadaStatus: 'active',
            variations: [
              {
                sellerSku: 'PM-1',
                status: 'active',
                price: 175,
                salePrice: 90,
                quantity: 3,
              },
              {
                sellerSku: 'PM-2',
                status: 'inactive',
                price: 175,
                salePrice: 0,
                quantity: 0,
              },
            ],
          },
          {
            itemId: '10',
            name: 'Gone',
            lazadaStatus: 'deleted',
            variations: [
              { sellerSku: 'X', status: 'active', price: 1, quantity: 1 },
            ],
          },
        ]),
      )

      const { items } = await service.getListings('lazada')
      expect(items).toHaveLength(1)
      expect(items[0]).toMatchObject({
        sku: 'PM-1',
        listPrice: 175,
        sellingPrice: 90,
        stock: 3,
      })
    })

    it('uses the TikTok promotion price (sent as a string) when present', async () => {
      http.get.mockReturnValue(
        page([
          {
            itemId: '5',
            name: 'Dry food',
            currency: 'THB',
            variations: [
              {
                sellerSku: 'BZ-1',
                originalPrice: 929,
                promotionPrice: '845',
                stock: 5,
              },
              {
                sellerSku: 'BZ-2',
                originalPrice: 929,
                promotionPrice: null,
                stock: 0,
              },
            ],
          },
        ]),
      )

      const { items } = await service.getListings('tiktok')
      expect(items.map((i) => [i.sku, i.listPrice, i.sellingPrice])).toEqual([
        ['BZ-1', 929, 845],
        ['BZ-2', 929, 929],
      ])
    })
  })
})

describe('parseBigsellerDateLabel', () => {
  it.each([
    ['29 Sep 2026', '2026-09-29'],
    ['01 Jan 2027', '2027-01-01'],
    ['5 Mar 2026', '2026-03-05'],
    ['Sep 29, 2026', null],
    ['29 Foo 2026', null],
  ])('%s → %s', (label, expected) => {
    expect(parseBigsellerDateLabel(label)).toBe(expected)
  })
})
