import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JsonFilter } from './common/json.filter';
import { SerializeInterceptor } from './common/serialize.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: false });
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',').map((v) => v.trim()) ?? [],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new JsonFilter());
  app.useGlobalInterceptors(new SerializeInterceptor());
  const config = new DocumentBuilder()
    .setTitle('SmartTraffic API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, config),
  );
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
void bootstrap();
