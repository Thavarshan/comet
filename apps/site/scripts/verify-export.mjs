import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('out');
const required = [
  'index.html',
  'download/index.html',
  '404.html',
  'robots.txt',
  '_headers',
];

for (const name of required) {
  const file = path.join(output, name);
  assert((await stat(file)).isFile(), `Missing static asset: ${name}`);
}

const html = await readFile(path.join(output, 'index.html'), 'utf8');
assert.match(html, /href="\/download\/"/);
assert.match(html, /Comet/);
assert.doesNotMatch(html, /_next\/image\?/);

const download = await readFile(
  path.join(output, 'download/index.html'),
  'utf8',
);
assert.ok(
  download.includes(
    'href="https://github.com/Thavarshan/comet/releases/latest"',
  ),
  'Missing exact latest stable release link',
);

const headers = await readFile(path.join(output, '_headers'), 'utf8');
assert.match(headers, /Content-Security-Policy:/);
console.log('Comet site static export verified');
