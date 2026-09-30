import { Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class DailySalesQueryDto {
  @ApiProperty({
    description: 'Calendar date (BigSeller account timezone), YYYY-MM-DD',
    example: '2026-09-30',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string
}
