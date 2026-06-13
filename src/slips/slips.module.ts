import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SlipsService } from './slips.service'
import { SlipsController } from './slips.controller'

@Module({
  imports: [ConfigModule],
  controllers: [SlipsController],
  providers: [SlipsService],
})
export class SlipsModule {}
