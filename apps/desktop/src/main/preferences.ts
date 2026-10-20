import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  defaultPreferences,
  migratePreferences,
  legacySchema,
  preferencesSchema,
  type Preferences,
} from '@honeymelon/contracts';

/**
 * Persist versioned preferences through serialized, atomic file replacement.
 * Canonical values take precedence over the one-time legacy import.
 */
export class PreferenceStore {
  private value: Preferences;

  private existing = false;

  private writes: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly filename: string,
    defaultDirectory: string,
  ) {
    this.value = defaultPreferences(defaultDirectory);
  }

  /**
   * Load canonical values, preserving malformed files for recovery.
   */
  async load(): Promise<Preferences> {
    try {
      this.value = migratePreferences(
        JSON.parse(await readFile(this.filename, 'utf8')),
      );
      this.existing = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        // Preserve invalid data for recovery instead of silently overwriting
        // it.
        await rename(this.filename, `${this.filename}.invalid-${Date.now()}`);
      }
    }

    return this.get();
  }

  /**
   * Await pending writes before the application exits.
   */
  async flush(): Promise<void> {
    await this.writes;
  }

  /**
   * Return a detached value so consumers cannot mutate stored preferences.
   */
  get(): Preferences {
    return structuredClone(this.value);
  }

  /**
   * Validate and queue a write; failures do not block later writes.
   */
  save(input: Preferences): Promise<Preferences> {
    const next = preferencesSchema.parse(input);
    if (
      Object.values(next.media).some((item) => !path.isAbsolute(item.directory))
    ) {
      return Promise.reject(new Error('Absolute directory required'));
    }

    const write = this.writes
      .catch(() => {})
      .then(async () => {
        await mkdir(path.dirname(this.filename), { recursive: true });
        const temporary = `${this.filename}.tmp`;
        await writeFile(temporary, JSON.stringify(next, null, 2), {
          mode: 0o600,
        });
        await rename(temporary, this.filename);
        this.value = next;
        this.existing = true;

        return this.get();
      });
    this.writes = write;

    return write;
  }

  /**
   * Import known locale/theme keys once, when canonical values are absent.
   */
  importLegacy(input: unknown): Promise<Preferences> {
    const legacy = legacySchema.parse(input);

    return this.writes
      .catch(() => {})
      .then(() => {
        if (this.value.legacyImported) {
          return this.get();
        }

        return this.save({
          ...this.value,
          ...(!this.existing && legacy.locale !== undefined
            ? { locale: legacy.locale }
            : {}),
          ...(!this.existing && legacy.theme !== undefined
            ? { theme: legacy.theme }
            : {}),
          legacyImported: true,
        });
      });
  }
}
