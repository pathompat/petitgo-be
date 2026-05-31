import { IsEnum, IsOptional, IsString } from 'class-validator'

export class UpdateTimesheetDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: string

  @IsString()
  @IsOptional()
  remark?: string
}
