export interface Constructor<T = unknown> {
  prototype: Prototype;
  new (...args: unknown[]): T;
}

export type Prototype = object;
