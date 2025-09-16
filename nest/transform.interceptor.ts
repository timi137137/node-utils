import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getClientIp } from '@supercharge/request-ip';
import type { FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type { ResponseBody } from '../';
import { transformJson } from '../';

@Injectable()
export class TransformInterceptor<T extends ResponseBody<unknown>>
  implements NestInterceptor<T, ResponseBody<T> | StreamableFile>
{
  private readonly logger = new Logger(TransformInterceptor.name);
  private readonly env: string | undefined;
  private readonly log: string | undefined;

  constructor(@Inject(ConfigService) configServiceOrEnv?: ConfigService | string) {
    if (configServiceOrEnv) {
      if (typeof configServiceOrEnv === 'string') {
        this.env = configServiceOrEnv;
        this.log = 'false';
      } else {
        this.env = configServiceOrEnv.get('NODE_ENV', 'development');
        this.log = configServiceOrEnv.get('CONSOLE_LOG', 'false');
      }
    }
  }

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResponseBody<T> | StreamableFile> {
    const request = context.switchToHttp().getRequest();
    const isProd = this.env?.toLowerCase() === 'production';

    // Writes request information to the log
    if (this.log === 'true') {
      this.printRequest(request, !isProd);
    }

    return next.handle().pipe(
      map((Data) => {
        // If it is a file stream, return it
        if (Data instanceof StreamableFile) return Data;

        return {
          code: 0,
          message: 'Successful',
          data: Data ?? ({} as T),
        };
      }),
    );
  }

  private printRequest(request: FastifyRequest, isVerbose: boolean) {
    const ip = getClientIp(request);
    const baseData = {
      request_id: request.id,
      method: request.method,
      originalUrl: request.originalUrl,
      ip: ip || 'None IP',
    };

    if (isVerbose) {
      this.logger.verbose(
        transformJson({
          ...baseData,
          params: request.params || null,
          query: request.query || null,
          body: request.body || null,
        }),
      );
    } else {
      this.logger.log(transformJson(baseData));
    }
  }
}
