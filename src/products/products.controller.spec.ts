jest.mock('../firebase')

import { Test, TestingModule } from '@nestjs/testing'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'
import { BigsellerService } from '../bigseller/bigseller.service'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { REQUEST } from '@nestjs/core'

describe('ProductsController', () => {
  let controller: ProductsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
        BigsellerService,
        { provide: REQUEST, useValue: { user: null } },
        { provide: HttpService, useValue: { get: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile()

    controller = module.get<ProductsController>(ProductsController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
