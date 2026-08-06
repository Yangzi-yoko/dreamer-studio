import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const path = request.url;

    let code = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof BusinessException) {
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      code = exception.getStatus();
      const responseBody = exception.getResponse();
      const responseMessage = typeof responseBody === 'string' ? responseBody : (responseBody as any)?.message;
      if (Array.isArray(responseMessage)) {
        message = responseMessage.join('; ');
      } else if (typeof responseMessage === 'string') {
        message = responseMessage;
      } else {
        message = exception.message;
      }
    } else {
      this.logger.error((exception as Error).message, (exception as Error).stack);
    }

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(status).json({ code, message, timestamp: new Date().toISOString(), path });
  }
}
