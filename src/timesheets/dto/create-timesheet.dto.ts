import { IsEnum, IsOptional, IsString } from 'class-validator'

export class CreateTimesheetDto {
  @IsEnum(['OT-WD', 'OT-DO', 'LIVE', 'CS-FINANCE'])
  type: string

  @IsString()
  startAt: string

  @IsString()
  endAt: string

  @IsString()
  @IsOptional()
  remark?: string
}
