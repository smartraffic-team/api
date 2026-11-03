import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch()
export class JsonFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Erro interno';
    if (error instanceof HttpException) {
      status = error.getStatus();
      message = error.getResponse();
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        status = 409;
        message = 'Registro duplicado';
      } else if (error.code === 'P2003') {
        status = 422;
        message = 'Referência inválida';
      } else if (error.code === 'P2025') {
        status = 404;
        message = 'Registro não encontrado';
      }
    } else if (
      error instanceof Prisma.PrismaClientUnknownRequestError &&
      /check constraint/i.test(error.message)
    ) {
      status = 422;
      message = 'Restrição do banco violada';
    }
    response.status(status).json({
      statusCode: status,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
}
