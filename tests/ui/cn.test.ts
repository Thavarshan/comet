import { cn } from '../../src/ui/utils';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

jest.mock('clsx');
jest.mock('tailwind-merge');

describe('cn', () => {
  const mockedClsx = jest.mocked(clsx);
  const mockedTwMerge = jest.mocked(twMerge);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should merge classes using clsx and twMerge', () => {
    mockedClsx.mockReturnValue('class1 class2');
    mockedTwMerge.mockReturnValue('merged-class');

    const result = cn('class1', 'class2');

    expect(result).toBe('merged-class');
    expect(mockedClsx).toHaveBeenCalledWith(['class1', 'class2']);
    expect(mockedTwMerge).toHaveBeenCalledWith('class1 class2');
  });

  test('should handle empty inputs', () => {
    mockedClsx.mockReturnValue('');
    mockedTwMerge.mockReturnValue('');

    const result = cn();

    expect(result).toBe('');
    expect(mockedClsx).toHaveBeenCalledWith([]);
    expect(mockedTwMerge).toHaveBeenCalledWith('');
  });

  test('should handle multiple class inputs', () => {
    mockedClsx.mockReturnValue('class1 class2 class3');
    mockedTwMerge.mockReturnValue('merged-class');

    const result = cn('class1', 'class2', 'class3');

    expect(result).toBe('merged-class');
    expect(mockedClsx).toHaveBeenCalledWith(['class1', 'class2', 'class3']);
    expect(mockedTwMerge).toHaveBeenCalledWith('class1 class2 class3');
  });
});
