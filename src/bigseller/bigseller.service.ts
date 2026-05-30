import { Injectable, ForbiddenException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { Observable, map, catchError, lastValueFrom } from 'rxjs'
import { AxiosResponse } from 'axios'
import { adminDb } from '../firebase'

@Injectable()
export class BigsellerService {
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
