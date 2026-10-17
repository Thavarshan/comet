import type { Page } from '@playwright/test';

/**
 * Upload real local paths in Electron; browsers can use setInputFiles.
 */
export async function selectDesktopFiles(
  page: Page,
  files: string[],
): Promise<void> {
  // CDP-connected Playwright uploads bytes by default, which creates synthetic
  // Files
  // without native paths. Set the real file input through Chromium's native DOM
  // API.
  const client = await page.context().newCDPSession(page);
  const { root } = await client.send('DOM.getDocument');
  const { nodeId } = await client.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '[role="tabpanel"]:not([hidden]) input[type="file"]',
  });
  await client.send('DOM.setFileInputFiles', { nodeId, files });
  await client.detach();
}
