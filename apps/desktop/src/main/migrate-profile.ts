import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, unlink } from 'node:fs/promises';
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
      const status = await lstat(source);
      if (!status.isFile() || status.size > 1024 * 1024) {
        continue;
      }

      original = await readFile(source, 'utf8');
      migratePreferences(JSON.parse(original));
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code === 'ENOENT' ||
        error instanceof SyntaxError ||
        (error instanceof Error && error.name === 'ZodError')
      ) {
        continue;
      }

      throw error;
    }

    await mkdir(destination, { recursive: true });
    try {
      await copyFile(source, target, constants.COPYFILE_EXCL);
      // Validate what was actually copied in case the old app wrote meanwhile.
      migratePreferences(JSON.parse(await readFile(target, 'utf8')));
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
