import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { builtinModules } from 'node:module';

const nodeModules = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);

async function files(directory) {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map((entry) =>
        entry.isDirectory()
          ? files(path.join(directory, entry.name))
          : path.join(directory, entry.name),
      ),
    )
  ).flat();
}

for (const directory of [
  'packages/contracts/src',
  'packages/ui/src',
  'packages/engine/src',
  'apps/desktop/src/renderer',
]) {
  for (const file of await files(directory)) {
    if (!/\.[cm]?[jt]sx?$/.test(file) || /\.test\./.test(file)) {
      continue;
    }

    const text = await readFile(file, 'utf8');
    const imports = [
      ...text.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)/g),
    ].map((match) => match[1]);
    for (const name of imports) {
      const banned = directory.includes('contracts')
        ? /^(node:|electron|react|vue|@comet\/engine)/
        : directory.includes('/ui/')
          ? /^(node:|electron|@comet\/(engine|desktop|contracts))/
          : directory.includes('engine')
            ? /^(electron|react|vue)/
            : /^(node:|electron|@comet\/engine)/;
      if (
        banned.test(name) ||
        /^@comet\/e2e(?:\/|$)/.test(name) ||
        (!directory.includes('engine') && nodeModules.has(name))
      ) {
        throw new Error(`Boundary violation in ${file}: ${name}`);
      }
    }
  }
}

console.log('Workspace boundaries verified');
