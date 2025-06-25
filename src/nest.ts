import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiProperty } from '@nestjs/swagger';

import type { Constructor } from '@/utils';

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
