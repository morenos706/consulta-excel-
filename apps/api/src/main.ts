import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));

  // CORS: whitelist explícita por ambiente (ver docs/SECURITY.md §3), nunca "*" en producción.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');
  app.enableCors({ origin: allowedOrigins, credentials: true });

  // Documentación interactiva de la API (ver docs/API.md §1). En
  // producción se recomienda protegerla (p. ej. detrás de VPN/IP allowlist
  // en el WAF) en vez de dejarla completamente pública.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Seguridad 360 Colombia — API')
    .setDescription('SG-SST, brigadas, inspecciones, hallazgos e indicadores. Usa /api/v1/auth/dev-login para obtener un token de prueba (solo con AUTH_MODE=dev).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, swaggerDocument);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`Seguridad 360 Colombia API escuchando en el puerto ${port}`, 'Bootstrap');
  Logger.log(`Documentación interactiva: http://localhost:${port}/api/v1/docs`, 'Bootstrap');
}

bootstrap();
