import { expect, type Locator, type Page } from '@playwright/test';

export type UploadFiles = (page: Page, paths: string[]) => Promise<void>;

/**
 * Drive shared conversion UI without importing Electron or the native engine.
 * Browsers use normal uploads; desktop injects its real-path CDP uploader.
 */
export class ConverterPage {
  readonly panel: Locator;

  constructor(
    readonly page: Page,
    private readonly upload: UploadFiles = async (page, paths) => {
      await page
        .locator('[role="tabpanel"]:not([hidden]) input[type=file]')
        .setInputFiles(paths);
    },
  ) {
    this.panel = page.getByRole('tabpanel');
  }

  /** Select a source category using its localized, accessible tab name. */
  async selectMedia(name: string): Promise<void> {
    await this.page.getByRole('tab', { name, exact: true }).click();
  }

  /** Submit fixtures using the host's upload transport. */
  async addFiles(paths: string[]): Promise<void> {
    await this.upload(this.page, paths);
  }

  /** Search the real output picker rather than altering renderer state. */
  async selectFormat(format: string): Promise<void> {
    await this.panel.getByRole('combobox', { name: 'Output format' }).click();
    await this.page
      .getByRole('combobox', { name: 'Search formats' })
      .fill(format);
    await this.page
      .getByRole('option', {
        name: format.toUpperCase(),
        exact: true,
      })
      .click();
  }

  /** Submit only through the user-facing conversion action. */
  async convert(): Promise<void> {
    await this.panel
      .getByRole('button', { name: 'Convert', exact: true })
      .click();
  }

  /** Wait for a real terminal state with a native conversion timeout. */
  async expectComplete(): Promise<void> {
    await expect(this.panel.getByText('Complete', { exact: true })).toBeVisible(
      { timeout: 20000 },
    );
  }
}
