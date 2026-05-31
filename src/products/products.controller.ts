import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ProductsService } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { BigsellerService } from '../bigseller/bigseller.service'

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private bigsellerService: BigsellerService,
  ) {}

  @ApiOperation({ summary: 'Create a product' })
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto)
  }

  @ApiOperation({ summary: 'List all products (Firestore + Bigseller)' })
  @Get()
  async findAll() {
    const bigseller = await this.bigsellerService.getListProductShopee()
    return { firestore: await this.productsService.findAll(), bigseller }
  }

  @ApiOperation({ summary: 'Get a product by id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id)
  }

  @ApiOperation({ summary: 'Update a product' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto)
  }

  @ApiOperation({ summary: 'Delete a product' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id)
  }
}
