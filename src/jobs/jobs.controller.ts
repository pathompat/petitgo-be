import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AdminGuard } from '../auth/admin.guard'
import { JobsService } from './jobs.service'
import { Job } from './entities/job'

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({
    summary: 'List scheduler jobs and their last run time (admin only)',
  })
  @Get()
  findAll(): Promise<Job[]> {
    return this.jobsService.findAll()
  }

  @ApiOperation({
    summary:
      'Run a scheduler job now via Cloud Scheduler, bypassing its daily guard (admin only)',
  })
  @Post(':id/run')
  run(@Param('id') id: string): Promise<{ triggeredAt: string }> {
    return this.jobsService.run(id)
  }
}
