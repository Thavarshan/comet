import path from 'node:path';
import { builtinModules } from 'node:module';
import ts from 'typescript';

const builtins = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);
const dependencies = {
  contracts: [],
  core: ['contracts'],
  converter: ['contracts', 'core', 'ui'],
  'browser-engine': ['contracts', 'core'],
  ui: [],
  engine: ['contracts', 'core'],
  renderer: ['contracts', 'core', 'converter', 'ui'],
  web: ['contracts', 'core', 'converter', 'ui', 'browser-engine'],
  site: ['contracts', 'ui'],
};

/** Resolve runtime ownership for source and built files on either OS. */
export function boundaryOwner(filename) {
  const normalized = path
    .relative(process.cwd(), filename)
    .replaceAll('\\', '/');
  if (/(?:^|\/)apps\/desktop\/src\/renderer(?:\/|$)/.test(normalized)) {
    return 'renderer';
  }

  return /^(packages|apps)\/([^/]+)(?:\/|$)/.exec(normalized)?.[2];
}

/** Inspect syntax, including side effects, re-exports, and type imports. */
export function sourceImports(filename, source) {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest);
  const imports = [];
  const add = (expression, node) => {
    const position = file.getLineAndCharacterOfPosition(node.getStart(file));
    imports.push({
      specifier:
        expression && ts.isStringLiteralLike(expression)
          ? expression.text
          : null,
      line: position.line + 1,
    });
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) {
        add(node.moduleSpecifier, node);
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node.moduleReference.expression, node);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      add(node.arguments[0], node);
    } else if (ts.isImportTypeNode(node)) {
      add(node.argument.literal, node);
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  return imports;
}

/** Return an actionable reason for an invalid runtime dependency. */
export function boundaryViolation(owner, specifier, resolvedFile) {
  if (!Object.hasOwn(dependencies, owner)) {
    return `No runtime boundary policy for ${owner}`;
  }

  const browser = owner !== 'engine';
  if (specifier === null) {
    return browser ? 'Computed imports cannot be boundary-checked' : null;
  }

  if (browser && (specifier.startsWith('node:') || builtins.has(specifier))) {
    return 'Node builtin in browser-safe code';
  }

  if (/^electron(?:\/|$)/.test(specifier)) {
    return 'Electron is restricted to desktop main/preload';
  }

  if (
    browser &&
    /^(?:ffmpeg-static|ffprobe-static|@ffmpeg-installer\/)/.test(specifier)
  ) {
    return 'Native executable dependency in browser-safe code';
  }

  if (
    ['contracts', 'core', 'browser-engine', 'engine'].includes(owner) &&
    /^(?:react(?:-dom)?|vue)(?:\/|$)/.test(specifier)
  ) {
    return 'UI framework in platform-neutral domain or engine';
  }

  const workspace = /^@honeymelon\/([^/]+)/.exec(specifier)?.[1];
  const target = (resolvedFile && boundaryOwner(resolvedFile)) || workspace;
  if (target && target !== owner && !dependencies[owner].includes(target)) {
    return `${owner} cannot depend on ${target}`;
  }

  if (specifier.startsWith('.') && resolvedFile && !target) {
    return 'Relative import escapes workspace runtime boundaries';
  }

  return null;
}

/** Resolve relative imports before a workspace has produced build output. */
export function relativeImport(filename, specifier) {
  return specifier?.startsWith('.')
    ? path.resolve(path.dirname(filename), specifier)
    : undefined;
}
