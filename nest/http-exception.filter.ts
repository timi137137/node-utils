import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getClientIp } from '@supercharge/request-ip';
import { createError, ServiceError } from '@timi137/errors';
import { plainToInstance } from 'class-transformer';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { omit, pick } from 'lodash';
import { VError } from 'verror';

import { transformJson } from '../';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly env: string | undefined;

  constructor(@Inject(ConfigService) configServiceOrEnv?: ConfigService | string) {
    if (configServiceOrEnv) {
      if (typeof configServiceOrEnv === 'string') {
        this.env = configServiceOrEnv;
      } else {
        this.env = configServiceOrEnv.get<string>('NODE_ENV', 'development');
      }
    }
  }

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    // if Nest exception, transform to ServiceError
    if (exception instanceof HttpException) {
      const data = exception.getResponse();
      const childError = new ServiceError('UNKNOWN', '未知错误', {
        httpCode: exception.getStatus(),
        causedBy: exception,
        ...(typeof data === 'string' ? {} : data),
      });
      return this.catch(childError, host);
    }

    if (exception['code'] === 2 && exception['details']) {
      try {
        const json = JSON.parse(exception['details']);
        if (json.$isServiceError) {
          exception = plainToInstance(ServiceError, json as object);
        } else {
          exception = createError.UNKNOWN(json.message, { causedBy: exception });
        }
      } catch {
        return this.catch(createError.UNKNOWN(exception['details'], { causedBy: exception }), host);
      }
      return this.catch(exception, host);
    }

    // if not ServiceError, transform to ServiceError
    if (!(exception instanceof ServiceError)) {
      const childError = ServiceError.fromError(exception);
      return this.catch(childError, host);
    }

    const resp = this.getResponse(exception);
    const status = this.getHttpCode(exception);
    const logInfo = getLogInfo(exception, request);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logInfo, exception?.stack, exception?.serviceName);
    } else {
      this.logger.debug(logInfo, exception?.serviceName);
    }

    // if response is already sent, do nothing
    if (response.sent) return;

    response.status(status).send(resp);
  }

  private getResponse(err: Error): string {
    const isProd = this.env?.toLowerCase() === 'production';

    if (err instanceof ServiceError) {
      const data = omit(err.toJSON(), ['$isServiceError', 'serviceName']);
      return isProd ? transformJson(data, omitStack) : transformJson(data);
    }

    if (err instanceof VError) {
      const info = VError.info(err);
      const baseObj = isProd
        ? { ...pick(err, 'message', 'name'), ...info }
        : { ...pick(err, 'message', 'name', 'stack'), ...info };
      return transformJson(baseObj, isProd ? omitStack : undefined);
    }

    const baseObj = isProd
      ? { ...pick(err, 'message', 'name'), ...omit(err, 'stack') }
      : { ...pick(err, 'message', 'name', 'stack'), ...err };

    return transformJson(baseObj, isProd ? omitStack : undefined);
  }

  private getHttpCode(err: Error): number {
    if (err instanceof ServiceError) {
      return err.httpCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
    } else if (err instanceof HttpException) {
      return err.getStatus();
    } else {
      return err['httpCode'] ?? err['status'] ?? err['statusCode'] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}

function omitStack(key: string, value: unknown): unknown {
  if (key === 'stack') return undefined;
  return value;
}

function getLogInfo(exception: Error, request: FastifyRequest) {
  return {
    exception,
    request_id: request.id,
    request: {
      method: request.method,
      url: request.originalUrl || request.url,
      remoteAddress: getClientIp(request),
      body: request.body,
    },
  };
}
