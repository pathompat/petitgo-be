import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateSlipDto {
  @ApiProperty({
    description: 'Firebase Storage URL returned by POST /slip/upload',
  })
  @IsString()
  @IsNotEmpty()
  imageUrl: string

  @ApiProperty({ description: 'Free-text description of the slip' })
  @IsString()
  @IsNotEmpty()
  description: string

  @ApiProperty({ description: 'ISO 8601 datetime string of the upload' })
  @IsString()
  @IsNotEmpty()
  uploadDate: string

  @ApiProperty({ description: 'Transferred amount in THB (entered manually)' })
  @IsNumber()
  @Min(0)
  totalAmount: number
}
