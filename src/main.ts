import 'dotenv/config' // load .env before firebase.ts reads process.env
import './firebase' // initialize Firebase Admin from .env
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(new ValidationPipe())
  app.enableCors({ origin: true })

  const config = new DocumentBuilder()
    .setTitle('Petitgo API')
    .setDescription('Petitgo backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`Server running → http://localhost:${port}`)
  console.log(`Swagger UI    → http://localhost:${port}/api/docs`)
}

bootstrap()
