import { Injectable, ValidationPipe as NestValidationPipe } from '@nestjs/common';
import type { ValidationPipeOptions } from '@nestjs/common/pipes/validation.pipe';
import { createError } from '@timi137/errors';
import type { ValidationError } from 'class-validator';

/**
 * 比起 NestJS 默认的 ValidationPipe，这个 ValidationPipe 会将错误信息转换为 ServiceErrors
 */
@Injectable()
export class ClassValidationPipe extends NestValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = this.flattenValidationErrors(errors);
        return createError.INVALID_PARAMETERS(messages.join());
      },
      ...options,
    });
  }
}
