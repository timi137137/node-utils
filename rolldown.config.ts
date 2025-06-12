import { glob } from 'glob';
import { defineConfig } from 'rolldown';
import { dts } from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';

const srcEntries = glob.sync('src/**/*.ts', {
  ignore: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
});

export default defineConfig([
  {
    input: srcEntries,
    output: [
      {
        format: 'es',
        dir: 'dist/esm',
        preserveModules: true,
        exports: 'named',
        sourcemap: true,
      },
      {
        format: 'cjs',
        dir: 'dist/cjs',
        preserveModules: true,
        exports: 'named',
        sourcemap: true,
      },
    ],
    plugins: [
      terser({
        format: { comments: false },
      }),
    ],
  },
  {
    input: srcEntries,
    output: [
      {
        dir: 'dist/types',
        format: 'es',
        preserveModules: true,
      },
    ],
    plugins: [dts()],
  },
]);
