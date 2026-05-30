import 'dotenv/config' // load .env before firebase.ts reads process.env
import './firebase' // initialize Firebase Admin from .env
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(new ValidationPipe())
  app.enableCors({ origin: true })
  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`Server running → http://localhost:${port}`)
}

bootstrap()
