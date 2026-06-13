import { Module } from '@nestjs/common'
import { SlipsService } from './slips.service'
import { SlipsController } from './slips.controller'

@Module({
  controllers: [SlipsController],
  providers: [SlipsService],
})
export class SlipsModule {}
