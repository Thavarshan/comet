import { test, expect } from '@playwright/test';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  defaultConversion,
  formats,
  inputExtensions,
  mediaTypes,
  type MediaType,
} from '@honeymelon/contracts';
import { createExecutor, type EnginePaths } from '@honeymelon/engine';
import {
  conversionJob,
  createMatrixFixtures,
  mediaDigest,
  mediaSignal,
  verifyMedia,
  snapshotNativeTools,
  type MatrixFixtures,
} from '../src/media.js';
import { nativePaths } from '../src/paths.js';

interface MatrixCase {
  source: MediaType;
  input: string;
  target: MediaType;
  output: string;
  status:
    | 'not-run'
    | 'passed'
    | 'failed'
    | 'unavailable'
    | 'fixture-gap'
    | 'no-audio-track';
  reason?: string;
}

const cases: MatrixCase[] = [];
for (const source of mediaTypes) {
  for (const input of new Set(inputExtensions[source])) {
    const targets: readonly MediaType[] =
      source === 'video' ? mediaTypes : [source];
    for (const target of targets) {
      for (const output of formats[target]) {
        cases.push({ source, input, target, output, status: 'not-run' });
      }
    }
  }
}

let directory: string;
let fixtures: MatrixFixtures;
let paths: EnginePaths;
let execute: ReturnType<typeof createExecutor>;

test.beforeAll(async () => {
  test.setTimeout(120000);
  directory = await mkdtemp(path.join(tmpdir(), 'honeymelon-format-matrix-'));
  paths = await snapshotNativeTools(path.join(directory, 'tools'), nativePaths);
  execute = createExecutor(paths);
  fixtures = await createMatrixFixtures(
    path.join(directory, 'fixtures'),
    paths,
  );
});

test.afterAll(async () => {
  try {
    if (fixtures) {
      for (const fixture of fixtures.fixtures.values()) {
        expect(await mediaDigest(fixture.filename)).toBe(fixture.sha256);
      }
    }
  } finally {
    if (directory) {
      await rm(directory, { recursive: true, force: true });
    }
  }
});

test('reports accepted inputs without a verified sample', async ({
  playwright: _playwright,
}, info) => {
  await info.attach('input-coverage-gaps', {
    body: JSON.stringify(
      {
        capabilities: fixtures.capabilities,
        fixtureGaps: fixtures.gaps,
        fixtures: [...fixtures.fixtures.values()],
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  for (const media of mediaTypes) {
    expect(fixtures.capabilities[media].some((item) => item.available)).toBe(
      true,
    );
    for (const item of fixtures.capabilities[media]) {
      if (!item.available) {
        expect(item.reason).toBeTruthy();
      }
    }
  }

  if (process.env.HONEYMELON_REQUIRE_INPUT_COVERAGE === '1') {
    expect(fixtures.gaps, 'Supply the reported input-only fixtures').toEqual(
      [],
    );
  }
});

for (const entry of cases) {
  test(`${entry.source}/${entry.input} → ${entry.target}/${entry.output}`, async ({
    playwright: _playwright,
  }, info) => {
    const capability = fixtures.capabilities[entry.target].find(
      (item) => item.format === entry.output,
    );
    if (!capability?.available) {
      entry.status = 'unavailable';
      entry.reason = capability?.reason ?? 'No output profile';
      info.annotations.push({
        type: 'matrix-status',
        description: entry.status,
      });
      test.skip(true, entry.reason);
    }

    const source = fixtures.fixtures.get(`${entry.source}/${entry.input}`);
    if (!source) {
      entry.status = 'fixture-gap';
      entry.reason =
        fixtures.gaps.find(
          (gap) => gap.media === entry.source && gap.format === entry.input,
        )?.reason ?? 'No source fixture';
      info.annotations.push({
        type: 'matrix-status',
        description: entry.status,
      });
      test.skip(true, entry.reason);

      return;
    }

    const destination = info.outputPath('converted');
    await mkdir(destination, { recursive: true });
    const request = conversionJob(
      entry.source,
      source.filename,
      entry.output,
      destination,
      defaultConversion(entry.target),
    );
    try {
      if (entry.target === 'audio' && !source.hasAudio) {
        await expect(execute(request, mediaSignal(), () => {})).rejects.toThrow(
          'Selected audio track is unavailable',
        );
        expect(await readdir(destination)).toEqual([]);
        entry.status = 'no-audio-track';
        info.annotations.push({
          type: 'matrix-status',
          description: entry.status,
        });

        return;
      }

      const output = await execute(request, mediaSignal(), () => {});
      await verifyMedia(paths, output, entry.target);
      expect(path.resolve(output)).not.toBe(path.resolve(source.filename));
      expect(
        (await readdir(destination)).some((name) =>
          name.startsWith('.honeymelon-'),
        ),
      ).toBe(false);
      entry.status = 'passed';
    } catch (error) {
      entry.status = 'failed';
      entry.reason = String(error);
      throw error;
    }
  });
}
