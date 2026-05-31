import { Module } from '@nestjs/common'
import { TimesheetsService } from './timesheets.service'
import { TimesheetsController } from './timesheets.controller'

@Module({
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
})
export class TimesheetsModule {}
