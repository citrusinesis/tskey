import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const extensionPath = path.join(import.meta.dirname, '../.output/chrome-mv3');

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async (_, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    const extensionId = background.url().split('/')[2];
    if (!extensionId) {
      throw new Error('Failed to get extension ID');
    }
    await use(extensionId);
  },
});

export const expect = test.expect;
