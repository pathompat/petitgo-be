import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { JobsController } from './jobs.controller'
import { JobsService } from './jobs.service'

@Module({
  imports: [HttpModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
