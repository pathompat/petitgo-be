import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ description: 'Firebase ID token from Google Sign-In' })
  @IsNotEmpty()
  @IsString()
  idToken: string
}
