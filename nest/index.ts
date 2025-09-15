import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import type { Constructor } from '../';

// ==================== Swagger 语法糖 ====================

/**
 * Api文件上传装饰器
 * @param fileName
 * @constructor
 */
export function ApiFile(fileName: string = 'file'): MethodDecorator {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fileName]: {
            type: 'file',
            format: 'blob',
          },
        },
      },
    }),
  );
}

/**
 * Api描述装饰器
 * @param summary
 */
export const ApiSummary = (summary: string): MethodDecorator => ApiOperation({ summary });

// ==================== 分页相关类型 ====================

/**
 * 分页返回类型
 */
export interface Paged<T> {
  count: number;
  data: T[];
}

let DefaultPageLimit = 10;
const MAX_PAGE = 500;

export function setDefaultPageLimit(limit: number): void {
  DefaultPageLimit = limit;
}
export function getDefaultPageLimit(): number {
  return DefaultPageLimit;
}

/**
 * 分页DTO
 */
export class PagedDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page: number = 1;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(MAX_PAGE) limit: number = getDefaultPageLimit();

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  set skip(value: number) {
    // noop
  }
}

/**
 * 分页返回值DTO
 */
export interface PagedResDto<T> {
  count: number;
  data: T[];
}

/**
 * 分页返回值DTO函数
 * @param constructor 其他DTO
 * @constructor
 */
export function PagedResDto<T extends Constructor>(constructor: T): Constructor<PagedResDto<InstanceType<T>>> {
  const name = `Paged${constructor.name}`;

  class PagedRes implements PagedResDto<InstanceType<T>> {
    @ApiProperty()
    count!: number;

    @ApiProperty({ type: [constructor] })
    data!: InstanceType<T>[];
  }

  Reflect.defineProperty(PagedRes, 'name', {
    writable: false,
    enumerable: false,
    configurable: true,
    value: name,
  });

  return PagedRes;
}
