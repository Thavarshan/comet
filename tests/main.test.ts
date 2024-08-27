import { describe, expect, test } from '@jest/globals';

function sum(a: number, b: number): number {
  return a + b;
}

describe('sum module', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });
});
