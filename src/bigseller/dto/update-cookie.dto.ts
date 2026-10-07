import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateCookieDto {
  @ApiProperty({ description: 'Full Cookie header value sent to BigSeller' })
  @IsString()
  @IsNotEmpty()
  cookie: string
}
