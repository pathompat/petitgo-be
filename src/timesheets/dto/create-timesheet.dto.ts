import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateTimesheetDto {
  @ApiProperty({ enum: ['OT-WD', 'OT-DO', 'LIVE', 'CS-FINANCE'] })
  @IsEnum(['OT-WD', 'OT-DO', 'LIVE', 'CS-FINANCE'])
  type: string

  @ApiProperty({ description: 'ISO 8601 datetime string' })
  @IsString()
  startAt: string

  @ApiProperty({ description: 'ISO 8601 datetime string' })
  @IsString()
  endAt: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remark?: string
}
