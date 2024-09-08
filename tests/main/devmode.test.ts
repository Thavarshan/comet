import { isDevMode } from '../../src/lib/devmode';

describe('devMode', () => {
  const old = (process as any).defaultApp; // for tsconfig error

  afterEach(() => {
    Object.defineProperty(process, 'defaultApp', { value: old });
  });

  test('correctly returns true if defaultApp', () => {
    Object.defineProperty(process, 'defaultApp', {
      value: true,
      writable: true,
    });

    expect(isDevMode()).toBe(true);
  });

  test('correctly returns false if not defaultApp', () => {
    Object.defineProperty(process, 'defaultApp', {
      value: undefined,
      writable: true,
    });

    expect(isDevMode()).toBe(false);
  });
});
