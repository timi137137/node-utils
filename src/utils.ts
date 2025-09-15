import stringify from 'json-stringify-safe';

export function transformJson(content: unknown | string, replacer?: (this: any, key: string, value: any) => any) {
  return stringify(content, replacer, 4);
}

export interface Constructor<T = unknown> {
  prototype: Prototype;
  new (...args: unknown[]): T;
}

export type Prototype = object;
