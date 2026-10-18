import { IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { LISTING_PLATFORMS, ListingPlatform } from '../entities/listing'

export class ListingsQueryDto {
  @ApiProperty({ enum: LISTING_PLATFORMS, example: 'shopee' })
  @IsIn(LISTING_PLATFORMS)
  platform: ListingPlatform
}
