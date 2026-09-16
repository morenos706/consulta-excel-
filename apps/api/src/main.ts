import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));

  // CORS: whitelist explícita por ambiente (ver docs/SECURITY.md §3), nunca "*" en producción.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');
  app.enableCors({ origin: allowedOrigins, credentials: true });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`Seguridad 360 Colombia API escuchando en el puerto ${port}`, 'Bootstrap');
}

bootstrap();
