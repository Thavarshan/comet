/**
 * @jest-environment node
 */

import { getDesktopPath } from '../../src/lib/desktop-path';
import { existsSync } from 'fs';
import os from 'os';
import path from 'node:path';

jest.mock('fs');
jest.mock('os');
jest.mock('node:path');

describe('getDesktopPath', () => {
  const mockedExistsSync = jest.mocked(existsSync);
  const mockedHomedir = jest.mocked(os.homedir);
  const mockedResolve = jest.mocked(path.resolve);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should return the desktop directory if it exists', () => {
    mockedHomedir.mockReturnValue('/mock/home');
    mockedResolve.mockImplementation((...args) => args.join('/'));
    mockedExistsSync.mockReturnValue(true);

    const result = getDesktopPath();

    expect(result).toBe('/mock/home/Desktop');
    expect(mockedHomedir).toHaveBeenCalledTimes(2);
    expect(mockedResolve).toHaveBeenCalledWith('/mock/home');
    expect(mockedResolve).toHaveBeenCalledWith('/mock/home', 'Desktop');
    expect(mockedExistsSync).toHaveBeenCalledWith('/mock/home/Desktop');
  });

  test('should return the home directory if the desktop directory does not exist', () => {
    mockedHomedir.mockReturnValue('/mock/home');
    mockedResolve.mockImplementation((...args) => args.join('/'));
    mockedExistsSync.mockReturnValue(false);

    const result = getDesktopPath();

    expect(result).toBe('/mock/home');
    expect(mockedHomedir).toHaveBeenCalledTimes(2);
    expect(mockedResolve).toHaveBeenCalledWith('/mock/home');
    expect(mockedResolve).toHaveBeenCalledWith('/mock/home', 'Desktop');
    expect(mockedExistsSync).toHaveBeenCalledWith('/mock/home/Desktop');
  });
});
