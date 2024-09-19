/**
 * @jest-environment node
 */

import { mocked } from 'jest-mock';
import { setupDevTools } from '../../src/lib/utils/devtools';
import { isDevMode } from '../../src/lib/utils/devmode';

jest.mock('../../src/lib/devmode');

jest.mock('electron-devtools-installer', () => ({
  default: jest.fn(),
  VUEJS3_DEVTOOLS: 'VUEJS3_DEVTOOLS',
}));

describe('devtools', () => {
  test('does not set up developer tools if not in dev mode', async () => {
    const devtools = require('electron-devtools-installer');
    mocked(isDevMode).mockReturnValue(false);
    await setupDevTools();

    expect(devtools.default).toHaveBeenCalledTimes(0);
  });

  test('sets up developer tools if in dev mode', async () => {
    const devtools = require('electron-devtools-installer');
    mocked(isDevMode).mockReturnValue(true);
    await setupDevTools();

    expect(devtools.default).toHaveBeenCalledTimes(1);
  });

  test('catch error in setting up developer tools', async () => {
    const devtools = require('electron-devtools-installer');
    // throw devtool error
    devtools.default.mockRejectedValue(new Error('devtool error'));
    mocked(isDevMode).mockReturnValue(true);

    await setupDevTools();

    expect(devtools.default).toHaveBeenCalledTimes(1);
  });
});
