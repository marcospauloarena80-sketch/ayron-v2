import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression());

  const rawOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const allowedOrigins = rawOrigin.split(',').map(o => o.trim());
  app.enableCors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);
      // Allow any vercel.app subdomain (preview + production deployments)
      if (origin.endsWith('.vercel.app')) return cb(null, true);
      // Allow explicitly listed origins
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('AYRON API')
    .setDescription('Cognitive Clinical Operating System — API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port);
  console.log(`AYRON API running on port ${port}`);
}

bootstrap();
