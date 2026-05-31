import { Body, Controller, Delete, Get, Param, Put, Post, Query } from '@nestjs/common'
import { TimesheetsService } from './timesheets.service'
import { CreateTimesheetDto } from './dto/create-timesheet.dto'
import { UpdateTimesheetDto } from './dto/update-timesheet.dto'

@Controller('timesheet')
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Post()
  create(@Body() dto: CreateTimesheetDto) {
    return this.timesheetsService.create(dto)
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.timesheetsService.findAll(status)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTimesheetDto) {
    return this.timesheetsService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.timesheetsService.remove(id)
  }
}
