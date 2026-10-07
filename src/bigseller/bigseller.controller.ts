import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { AdminGuard } from '../auth/admin.guard'
import { BigsellerService } from './bigseller.service'
import { DailySalesQueryDto } from './dto/daily-sales-query.dto'
import { UpdateCookieDto } from './dto/update-cookie.dto'
import { DailySales } from './entities/daily-sales'
import { CookieDocument } from './entities/cookies'

@ApiTags('bigseller')
@ApiBearerAuth()
@Controller('bigseller')
export class BigsellerController {
  constructor(private bigsellerService: BigsellerService) {}

  @ApiOperation({
    summary: 'Store a new Bigseller session cookie in Firestore',
  })
  @ApiQuery({ name: 'cookie', description: 'Bigseller auth cookie value' })
  @ApiQuery({ name: 'session', description: 'Bigseller session value' })
  @Get('/cookie')
  async updateCookie(
    @Query('cookie') cookie: string,
    @Query('session') session: string,
  ): Promise<boolean> {
    return await this.bigsellerService.updateCookie(cookie, session)
  }

  @ApiOperation({
    summary: 'Daily sales totals (order count and amount) from BigSeller',
  })
  @Get('/sales')
  async getDailySales(@Query() query: DailySalesQueryDto): Promise<DailySales> {
    return await this.bigsellerService.getDailySales(query.date)
  }

  @ApiOperation({ summary: 'List stored Bigseller cookies (admin only)' })
  @UseGuards(AdminGuard)
  @Get('/cookies')
  async listCookies(): Promise<CookieDocument[]> {
    return await this.bigsellerService.listCookies()
  }

  @ApiOperation({ summary: 'Replace a stored Bigseller cookie (admin only)' })
  @UseGuards(AdminGuard)
  @Put('/cookies/:id')
  async setCookie(
    @Param('id') id: string,
    @Body() dto: UpdateCookieDto,
  ): Promise<CookieDocument> {
    return await this.bigsellerService.setCookie(id, dto.cookie)
  }
}
