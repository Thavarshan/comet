import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Resolve rules from both the SARIF driver and extension query packs. */
export function rejectSecurityFindings(report) {
  if (!Array.isArray(report.runs) || report.runs.length === 0) {
    throw new Error('Static analysis did not contain SARIF runs');
  }

  for (const run of report.runs) {
    const components = [run.tool?.driver, ...(run.tool?.extensions ?? [])];
    for (const result of run.results ?? []) {
      const descriptor = result.rule;
      const componentReference = descriptor?.toolComponent;
      let candidates = components.filter(Boolean);
      if (componentReference?.index !== undefined) {
        candidates = [run.tool?.extensions?.[componentReference.index]];
      } else if (componentReference?.name || componentReference?.guid) {
        candidates = candidates.filter((component) =>
          componentReference.guid
            ? component.guid === componentReference.guid
            : component.name === componentReference.name,
        );
      }

      const id = result.ruleId ?? descriptor?.id;
      const index = result.ruleIndex ?? descriptor?.index;
      const rules = candidates.flatMap((component) => component?.rules ?? []);
      let rule;
      if (id) {
        rule = rules.find((entry) => entry.id === id);
      } else if (candidates.length === 1) {
        rule = candidates[0]?.rules?.[index];
      }

      if (!rule) {
        throw new Error(`Cannot resolve SARIF rule: ${id ?? index}`);
      }

      const rawSeverity = rule.properties?.['security-severity'];
      const severity = rawSeverity === undefined ? 0 : Number(rawSeverity);
      if (!Number.isFinite(severity)) {
        throw new Error(`Invalid security severity: ${rule.id}`);
      }

      const level = result.level ?? rule.defaultConfiguration?.level;
      if (severity >= 7 || level === 'error') {
        const location = result.locations?.[0]?.physicalLocation;
        const filename = location?.artifactLocation?.uri ?? '<unknown file>';
        const line = location?.region?.startLine ?? '?';

        throw new Error(
          `Static analysis gate failed: ${rule.id} (${severity}) at ${filename}:${line}`,
        );
      }
    }
  }
}

/** Every generated report must pass; an absent report is a failed analysis. */
async function checkDirectory(directory) {
  const files = (await readdir(directory)).filter((file) =>
    file.endsWith('.sarif'),
  );
  if (!files.length) {
    throw new Error('Static analysis did not produce SARIF');
  }

  for (const file of files) {
    rejectSecurityFindings(
      JSON.parse(await readFile(path.join(directory, file), 'utf8')),
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await checkDirectory(process.argv[2]);
}
