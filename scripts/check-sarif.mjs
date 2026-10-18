import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const directory = process.argv[2];
const files = (await readdir(directory)).filter((file) =>
  file.endsWith('.sarif'),
);
if (!files.length) {
  throw new Error('Static analysis did not produce SARIF');
}

for (const file of files) {
  const report = JSON.parse(await readFile(path.join(directory, file), 'utf8'));
  for (const run of report.runs ?? []) {
    const rules = new Map(
      (run.tool.driver.rules ?? []).map((rule) => [rule.id, rule]),
    );
    for (const result of run.results ?? []) {
      const rule = rules.get(result.ruleId);
      const severity = Number(rule?.properties?.['security-severity'] ?? 0);
      if (severity >= 7 || result.level === 'error') {
        throw new Error(`Static analysis gate failed: ${result.ruleId}`);
      }
    }
  }
}
