import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateTimesheetDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'SETTLED'] })
  @IsEnum(['APPROVED', 'REJECTED', 'SETTLED'])
  status: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remark?: string
}
