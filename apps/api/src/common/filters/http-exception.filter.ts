import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/** Formato de error uniforme para toda la API — ver docs/API.md §1. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : null;
    const message = isHttpException
      ? typeof body === 'string'
        ? body
        : ((body as any)?.message ?? exception.message)
      : 'Error interno del servidor';

    if (!isHttpException) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: isHttpException ? HttpStatus[statusCode] : 'Internal Server Error',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
