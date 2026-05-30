import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import * as express from 'express'
import { AppModule } from './src/app.module'
import { ValidationPipe } from '@nestjs/common'

import { onRequest } from 'firebase-functions/v2/https'

const expressServer = express()

const createFunction = async (expressInstance): Promise<void> => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  )
  app.useGlobalPipes(new ValidationPipe())
  app.enableCors()
  await app.init()
}

exports.api = onRequest(async (request, response) => {
  await createFunction(expressServer)
  expressServer(request, response)
})
