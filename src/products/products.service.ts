import { Inject, Injectable } from '@nestjs/common'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { REQUEST } from '@nestjs/core'
import { Product } from './entities/product.entity'
import { adminDb } from '../firebase'

@Injectable()
export class ProductsService {
  private collection = adminDb.collection('products')

  constructor(@Inject(REQUEST) private readonly request: { user: any }) {}

  create(createProductDto: CreateProductDto) {
    return this.collection.add(createProductDto).then((doc) => {
      return { id: doc.id, ...createProductDto }
    })
  }

  findAll() {
    return this.collection
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          return []
        }

        const products: Product[] = []
        for (const doc of querySnapshot.docs) {
          products.push(doc.data() as Product)
        }

        return products
      })
  }

  findOne(id: number) {
    return `This action returns a #${id} product`
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${updateProductDto} product`
  }

  remove(id: number) {
    return `This action removes a #${id} product`
  }
}
