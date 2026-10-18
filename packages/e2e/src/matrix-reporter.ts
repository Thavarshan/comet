import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { nativeTarget } from './paths.js';

/** Preserve pair results even when Playwright replaces a failed worker. */
interface PairResult {
  source: string;
  input: string;
  target: string;
  output: string;
  status: string;
  reason?: string | undefined;
}

/** Aggregate native coverage independently of HTML and desktop reports. */
export default class MatrixReporter implements Reporter {
  private pairs = new Map<string, PairResult>();

  private fixtures: unknown = null;

  /** Seed all selected cases so interrupted and unrun work remains visible. */
  onBegin(_config: FullConfig, suite: Suite): void {
    for (const entry of suite.allTests()) {
      const match =
        /^(video|audio|image)\/(\S+) → (video|audio|image)\/(\S+)$/.exec(
          entry.title,
        );
      if (match) {
        this.pairs.set(entry.id, {
          source: match[1]!,
          input: match[2]!,
          target: match[3]!,
          output: match[4]!,
          status: 'not-run',
        });
      }
    }
  }

  /** Collect pair classifications and fixture coverage from each worker. */
  onTestEnd(entry: TestCase, result: TestResult): void {
    const coverage = result.attachments.find(
      (item) => item.name === 'input-coverage-gaps',
    );
    if (coverage?.body) {
      this.fixtures = JSON.parse(coverage.body.toString());
    }

    const pair = this.pairs.get(entry.id);
    if (!pair) {
      return;
    }

    const classification = result.annotations.find(
      (item) => item.type === 'matrix-status',
    );
    let status = 'failed';
    if (result.status === 'passed') {
      status = 'passed';
    } else if (result.status === 'skipped') {
      status = 'not-run';
    }

    pair.status = classification?.description ?? status;
    pair.reason =
      result.error?.message ??
      result.annotations.find((item) => item.type === 'skip')?.description;
  }

  /** Write a machine-readable target report without mixing platform results. */
  async onEnd(result: FullResult): Promise<void> {
    if (!this.pairs.size) {
      return;
    }

    const cases = [...this.pairs.values()];
    const counts = Object.fromEntries(
      [...new Set(cases.map((entry) => entry.status))].map((status) => [
        status,
        cases.filter((entry) => entry.status === status).length,
      ]),
    );
    const filename = path.resolve(
      'playwright-report',
      'native-matrix',
      `matrix-${nativeTarget}.json`,
    );
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(
      filename,
      JSON.stringify(
        {
          target: nativeTarget,
          testedAt: new Date().toISOString(),
          result: result.status,
          coverage: this.fixtures,
          counts,
          cases,
        },
        null,
        2,
      ),
    );
  }
}
