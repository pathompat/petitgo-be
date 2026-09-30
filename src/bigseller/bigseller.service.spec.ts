jest.mock('../firebase')

import { Test, TestingModule } from '@nestjs/testing'
import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
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
      providers: [
        BigsellerService,
        { provide: HttpService, useValue: http },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
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
