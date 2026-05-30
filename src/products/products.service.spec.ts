jest.mock('../firebase')

import { Test, TestingModule } from '@nestjs/testing'
import { ProductsService } from './products.service'
import { REQUEST } from '@nestjs/core'

describe('ProductsService', () => {
  let service: ProductsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: REQUEST, useValue: { user: null } },
      ],
    }).compile()

    service = module.get<ProductsService>(ProductsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
