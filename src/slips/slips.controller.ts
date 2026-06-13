import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { SlipsService } from './slips.service'
import { CreateSlipDto } from './dto/create-slip.dto'

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
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('image file is required')
    return this.slipsService.uploadImage(file)
  }

  @ApiOperation({ summary: 'Create a slip log (scans QR for total_amount)' })
  @Post()
  create(@Body() dto: CreateSlipDto) {
    return this.slipsService.create(dto)
  }
}
