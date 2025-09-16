import stringify from 'json-stringify-safe';

export function transformJson(content: unknown | string, replacer?: (this: any, key: string, value: any) => any) {
  return stringify(content, replacer, 4);
}

export interface ResponseBody<T> {
  code: number;
  message: string;
  data: T;
}

export interface Constructor<T = unknown> {
  prototype: Prototype;
  new (...args: unknown[]): T;
}

export type Prototype = object;

export const DEFAULT_SKIP = 0;
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
