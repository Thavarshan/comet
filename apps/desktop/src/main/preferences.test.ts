import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { PreferenceStore } from './preferences';

const directories: string[] = [];

async function location() {
  const directory = await mkdtemp(
    path.join(tmpdir(), 'honeymelon-preferences-'),
  );
  directories.push(directory);

  return path.join(directory, 'preferences.json');
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
it('imports known legacy values once and persists across restart', async () => {
  const filename = await location();
  const store = new PreferenceStore(filename, tmpdir());
  await store.load();
  const imported = await store.importLegacy({ locale: 'es', theme: 'dark' });
  expect(imported.locale).toBe('es');
  expect(imported.theme).toBe('dark');
  const restarted = new PreferenceStore(filename, tmpdir());
  await restarted.load();
  expect(
    (await restarted.importLegacy({ locale: 'ru', theme: 'light' })).locale,
  ).toBe('es');
  expect(JSON.parse(await readFile(filename, 'utf8')).version).toBe(2);
});
it('preserves canonical preferences and backs up malformed files', async () => {
  const filename = await location();
  const store = new PreferenceStore(filename, tmpdir());
  await store.load();
  await store.save({ ...store.get(), locale: 'de' });
  expect((await store.importLegacy({ locale: 'es' })).locale).toBe('de');
  await writeFile(filename, '{broken');
  const recovered = new PreferenceStore(filename, tmpdir());
  await recovered.load();
  expect(recovered.get().locale).toBe('en');
  expect(
    (await readdir(path.dirname(filename))).some((file) =>
      file.includes('.invalid-'),
    ),
  ).toBe(true);
});
it('rejects malformed updates and serializes overlapping writes', async () => {
  const store = new PreferenceStore(await location(), tmpdir());
  await store.load();
  await Promise.all([
    store.save({ ...store.get(), locale: 'fr' }),
    store.save({ ...store.get(), theme: 'dark' }),
  ]);
  expect(store.get().theme).toBe('dark');
  expect(() => store.save({ ...store.get(), version: 99 } as never)).toThrow();
});

it('keeps defaults when legacy keys are explicitly undefined', async () => {
  const store = new PreferenceStore(await location(), tmpdir());
  await store.load();

  const imported = await store.importLegacy({
    locale: undefined,
    theme: undefined,
  });

  expect(imported.locale).toBe('en');
  expect(imported.theme).toBe('system');
  expect(imported.legacyImported).toBe(true);
});
