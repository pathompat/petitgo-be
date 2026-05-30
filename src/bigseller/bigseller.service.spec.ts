jest.mock('../firebase')

import { Test, TestingModule } from '@nestjs/testing'
import { BigsellerService } from './bigseller.service'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'

describe('BigsellerService', () => {
  let service: BigsellerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BigsellerService,
        { provide: HttpService, useValue: { get: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile()

    service = module.get<BigsellerService>(BigsellerService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
