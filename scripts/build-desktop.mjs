import { build } from 'vite';
import { builtinModules } from 'node:module';
import { readFile } from 'node:fs/promises';

const external = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
];
for (const [entry, name] of [
  ['src/main/index.ts', 'main'],
  ['src/preload/index.ts', 'preload'],
  ['../../packages/engine/src/image-worker.ts', 'image-worker'],
]) {
  await build({
    configFile: false,
    resolve: { conditions: ['node'], mainFields: ['module', 'main'] },
    define: { MAIN_WINDOW_VITE_DEV_SERVER_URL: 'undefined' },
    build: {
      outDir: '.vite/build',
      emptyOutDir: false,
      target: 'node24',
      lib: { entry, formats: ['cjs'], fileName: () => `${name}.cjs` },
      rollupOptions: { external, output: { codeSplitting: false } },
    },
  });
  const contents = await readFile(`.vite/build/${name}.cjs`, 'utf8');
  const imports = [...contents.matchAll(/require\(["']([^"']+)["']\)/g)].map(
    (match) => match[1],
  );
  for (const dependency of imports) {
    if (!external.includes(dependency)) {
      throw new Error(`Unbundled runtime import in ${name}: ${dependency}`);
    }
  }
}

await build({
  configFile: 'vite.renderer.config.ts',
  base: './',
  build: { outDir: '.vite/renderer/main_window' },
});
