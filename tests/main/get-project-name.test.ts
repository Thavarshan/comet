import { getProjectName } from '../../src/lib/get-project-name';

describe('get-project-name', () => {
  describe('getProjectName()', () => {
    test('returns a random name', async () => {
      const result = getProjectName();
      expect(result).toBeTruthy();
    });

    test('returns a name from the local path if saved', async () => {
      const result = getProjectName('a/b/myFiddle');
      expect(result).toBe('myFiddle');
    });
  });
});
