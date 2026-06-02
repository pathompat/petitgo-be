import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LiffLoginDto {
  @ApiProperty({ description: 'LINE access token from LIFF SDK' })
  @IsNotEmpty()
  @IsString()
  accessToken: string
}
