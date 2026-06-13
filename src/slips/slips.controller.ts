import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { SlipsService } from './slips.service'
import { CreateSlipDto } from './dto/create-slip.dto'
import { parseMultipartFile } from './multipart.util'

@ApiTags('slips')
@ApiBearerAuth()
@Controller('slip')
export class SlipsController {
  constructor(private readonly slipsService: SlipsService) {}

  @ApiOperation({ summary: 'List slip upload logs' })
  @Get()
  findAll() {
    return this.slipsService.findAll()
  }

  @ApiOperation({ summary: 'Upload a slip image to Firebase Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @Post('upload')
  async upload(@Req() req: Request) {
    const file = await parseMultipartFile(req, 'image')
    if (!file || !file.buffer.length) {
      throw new BadRequestException('image file is required')
    }
    if (!/^image\//.test(file.mimetype)) {
      throw new BadRequestException('only image files are allowed')
    }
    return this.slipsService.uploadImage(file)
  }

  @ApiOperation({ summary: 'Create a slip log (scans QR for total_amount)' })
  @Post()
  create(@Body() dto: CreateSlipDto) {
    return this.slipsService.create(dto)
  }
}
