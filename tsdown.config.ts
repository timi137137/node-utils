import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/**/*.ts'],
    platform: 'node',
    dts: true,
    exports: {
      all: true,
    },
  },
]);
