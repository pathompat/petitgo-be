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
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe())
  app.enableCors()
  await app.init()
}

// Migrating to asia-southeast1. Deployed in both regions until every caller
// (petitgo-fe VITE_API_BASE_URL, petitgo-extension, petitgo-mcp) uses the
// asia-southeast1 URL; then drop 'us-central1' here.
exports.api = onRequest(
  { region: ['us-central1', 'asia-southeast1'] },
  async (request, response) => {
    await createFunction(expressServer)
    expressServer(request, response)
  },
)
