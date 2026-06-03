import { IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() username?: string
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string
  @ApiPropertyOptional() @IsOptional() @IsString() uid?: string
  @ApiPropertyOptional() @IsOptional() @IsString() lineUserId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string
}
