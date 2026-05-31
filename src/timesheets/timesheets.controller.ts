import { Body, Controller, Delete, Get, Param, Put, Post, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { TimesheetsService } from './timesheets.service'
import { CreateTimesheetDto } from './dto/create-timesheet.dto'
import { UpdateTimesheetDto } from './dto/update-timesheet.dto'

@ApiTags('timesheets')
@ApiBearerAuth()
@Controller('timesheet')
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @ApiOperation({ summary: 'Submit a new timesheet entry' })
  @Post()
  create(@Body() dto: CreateTimesheetDto) {
    return this.timesheetsService.create(dto)
  }

  @ApiOperation({ summary: 'List timesheet entries' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @Get()
  findAll(@Query('status') status?: string) {
    return this.timesheetsService.findAll(status)
  }

  @ApiOperation({ summary: 'Approve or reject a timesheet entry' })
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTimesheetDto) {
    return this.timesheetsService.update(id, dto)
  }

  @ApiOperation({ summary: 'Delete a timesheet entry' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.timesheetsService.remove(id)
  }
}
