import { Controller, Query, Get } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { BigsellerService } from './bigseller.service'

@ApiTags('bigseller')
@ApiBearerAuth()
@Controller('bigseller')
export class BigsellerController {
  constructor(private bigsellerService: BigsellerService) {}

  @ApiOperation({ summary: 'Store a new Bigseller session cookie in Firestore' })
  @ApiQuery({ name: 'cookie', description: 'Bigseller auth cookie value' })
  @ApiQuery({ name: 'session', description: 'Bigseller session value' })
  @Get('/cookie')
  async updateCookie(
    @Query('cookie') cookie: string,
    @Query('session') session: string,
  ): Promise<boolean> {
    return await this.bigsellerService.updateCookie(cookie, session)
  }
}
