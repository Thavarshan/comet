import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import {
  boundaryOwner,
  boundaryViolation,
  relativeImport,
  sourceImports,
} from './boundary-policy.mjs';

const ignored = new Set([
  'node_modules',
  'dist',
  'out',
  'coverage',
  'test-results',
  'playwright-report',
]);

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  return (
    await Promise.all(
      entries
        .filter(
          (entry) => !entry.name.startsWith('.') && !ignored.has(entry.name),
        )
        .map((entry) => {
          const filename = path.join(directory, entry.name);

          return entry.isDirectory() ? files(filename) : filename;
        }),
    )
  ).flat();
}

const options = new Map();
const violations = [];
const sources = (await Promise.all(['apps', 'packages'].map(files))).flat();
for (const manifest of sources.filter((file) =>
  /^(apps|packages)[/\\][^/\\]+[/\\]package.json$/.test(file),
)) {
  const owner = boundaryOwner(manifest);
  if (owner === 'desktop' || owner === 'e2e') {
    continue;
  }

  const metadata = JSON.parse(await readFile(manifest, 'utf8'));
  const policy = boundaryViolation(owner, '');
  if (policy) {
    violations.push(`${manifest}: ${policy}`);
  }

  for (const name of Object.keys({
    ...metadata.dependencies,
    ...metadata.peerDependencies,
    ...metadata.optionalDependencies,
  })) {
    const reason = boundaryViolation(owner, name);
    if (reason) {
      violations.push(`${manifest}: ${reason}: ${name}`);
    }
  }
}

for (const file of sources) {
  if (!/\.[cm]?[jt]sx?$/.test(file) || /\.(test|spec)\./.test(file)) {
    continue;
  }

  const normalized = file.replaceAll('\\', '/');
  const owner = boundaryOwner(file);
  if (
    owner === 'e2e' ||
    (!normalized.includes('/src/') &&
      !/^apps\/site\/(app|pages)\//.test(normalized)) ||
    (normalized.startsWith('apps/desktop/') && owner !== 'renderer')
  ) {
    continue;
  }

  const policy = boundaryViolation(owner, '');
  if (policy) {
    violations.push(`${file}: ${policy}`);
    continue;
  }

  const config = ts.findConfigFile(path.dirname(file), ts.sys.fileExists);
  if (config && !options.has(config)) {
    const source = ts.readConfigFile(config, ts.sys.readFile);
    if (source.error) {
      throw new Error(`Cannot read boundary compiler config: ${config}`);
    }

    options.set(
      config,
      ts.parseJsonConfigFileContent(source.config, ts.sys, path.dirname(config))
        .options,
    );
  }

  for (const { specifier, line } of sourceImports(
    file,
    await readFile(file, 'utf8'),
  )) {
    const resolved = specifier
      ? ts.resolveModuleName(specifier, file, options.get(config) ?? {}, ts.sys)
          .resolvedModule?.resolvedFileName
      : undefined;
    const reason = boundaryViolation(
      owner,
      specifier,
      relativeImport(file, specifier) ?? resolved,
    );
    if (reason) {
      violations.push(
        `${file}:${line}: ${reason}: ${specifier ?? '<computed>'}`,
      );
    }
  }
}

if (violations.length) {
  throw new Error(`Workspace boundary violations:\n${violations.join('\n')}`);
}

console.log('Workspace boundaries verified');
