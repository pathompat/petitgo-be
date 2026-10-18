import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { BigsellerService } from './bigseller.service'
import { BigsellerController } from './bigseller.controller'

@Module({
  imports: [HttpModule],
  controllers: [BigsellerController],
  providers: [BigsellerService],
  exports: [BigsellerService],
})
export class BigsellerModule {}
