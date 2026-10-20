import { constants } from 'node:fs';
import { lstat, mkdir, open, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { migratePreferences } from '@honeymelon/contracts';

/** Only these historical profile names are read; no old profile is modified. */
export const legacyProfileNames = ['Comet', 'comet'] as const;

/**
 * Import validated versioned settings, preserving the original for rollback.
 * Exclusive copying prevents concurrent replacement of newer settings.
 * Cookies, caches, credentials and runtime jobs are not imported.
 */
export async function migrateProfile(
  applicationData: string,
  destination: string,
): Promise<'existing' | 'imported' | 'absent'> {
  const filename = 'preferences-v1.json';
  const target = path.join(destination, filename);

  try {
    await lstat(target);

    return 'existing';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  for (const name of legacyProfileNames) {
    const source = path.join(applicationData, name, filename);
    let original: string;

    try {
      const handle = await open(
        source,
        constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
      );
      try {
        // Inspect the opened file, not a path that could be replaced later.
        const status = await handle.stat();
        const maximum = 1024 * 1024;
        if (
          !status.isFile() ||
          status.size > maximum ||
          (await lstat(source)).isSymbolicLink()
        ) {
          continue;
        }

        // Bound allocation even if another process grows the file meanwhile.
        const buffer = Buffer.alloc(maximum + 1);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        if (bytesRead > maximum) {
          continue;
        }

        original = buffer.subarray(0, bytesRead).toString('utf8');
        migratePreferences(JSON.parse(original));
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (
        ['ENOENT', 'ELOOP'].includes(
          (error as NodeJS.ErrnoException).code ?? '',
        ) ||
        error instanceof SyntaxError ||
        (error instanceof Error && error.name === 'ZodError')
      ) {
        continue;
      }

      throw error;
    }

    await mkdir(destination, { recursive: true });
    try {
      // Publish the validated bytes; never reopen a mutable source path.
      await writeFile(target, original, { flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        return 'existing';
      }

      // Remove only our own incomplete import; never remove the old profile.
      await unlink(target).catch(() => {});
      throw error;
    }

    return 'imported';
  }

  return 'absent';
}
