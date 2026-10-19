import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rejectSecurityFindings } from '../check-sarif.mjs';

const highRule = {
  id: 'js/example-high',
  properties: { 'security-severity': '8.1' },
};

test('high severity rules in CodeQL extension packs fail the gate', () => {
  const report = {
    runs: [
      {
        tool: {
          driver: { name: 'CodeQL', rules: [] },
          extensions: [{ name: 'javascript', rules: [highRule] }],
        },
        results: [{ ruleId: highRule.id, level: 'warning' }],
      },
    ],
  };
  assert.throws(() => rejectSecurityFindings(report), /example-high/);
});

test('driver rules and explicit extension references are checked', () => {
  for (const reference of [
    { index: 0 },
    { name: 'javascript' },
    { guid: 'query-pack' },
  ]) {
    assert.throws(
      () =>
        rejectSecurityFindings({
          runs: [
            {
              tool: {
                driver: { name: 'CodeQL', rules: [] },
                extensions: [
                  { name: 'javascript', guid: 'query-pack', rules: [highRule] },
                ],
              },
              results: [{ rule: { index: 0, toolComponent: reference } }],
            },
          ],
        }),
      /example-high/,
    );
  }

  assert.throws(
    () =>
      rejectSecurityFindings({
        runs: [
          {
            tool: { driver: { rules: [highRule] } },
            results: [{ ruleId: highRule.id }],
          },
        ],
      }),
    /example-high/,
  );
});

test('low severity results pass while unknown rules fail closed', () => {
  const report = {
    runs: [
      {
        tool: {
          driver: {
            rules: [{ id: 'low', properties: { 'security-severity': '3.0' } }],
          },
        },
        results: [{ ruleId: 'low', level: 'warning' }],
      },
    ],
  };
  assert.doesNotThrow(() => rejectSecurityFindings(report));
  report.runs[0].results[0].ruleId = 'missing';
  assert.throws(() => rejectSecurityFindings(report), /Cannot resolve/);
  assert.throws(() => rejectSecurityFindings({ runs: [] }), /SARIF runs/);
});
