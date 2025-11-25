import { test, expect } from './fixtures';

test.describe('Popup', () => {
  test('should show setup page on first run', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(popup.getByText('Welcome to TSKey!')).toBeVisible();
    await expect(popup.getByRole('button', { name: 'Start with Password' })).toBeVisible();
  });

  test('should complete password setup flow', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await popup.getByRole('button', { name: 'Start with Password' }).click();

    await popup.getByPlaceholder('Create master password').fill('testpassword123');
    await popup.getByPlaceholder('Confirm password').fill('testpassword123');
    await popup.getByRole('button', { name: 'Create Seed' }).click();

    await expect(popup.getByText('Backup Your Seed')).toBeVisible({ timeout: 5000 });
  });

  test('should generate password after setup', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await popup.getByRole('button', { name: 'Start with Password' }).click();
    await popup.getByPlaceholder('Create master password').fill('testpassword123');
    await popup.getByPlaceholder('Confirm password').fill('testpassword123');
    await popup.getByRole('button', { name: 'Create Seed' }).click();

    await expect(popup.getByText('Backup Your Seed')).toBeVisible({ timeout: 5000 });

    await popup.getByRole('button', { name: 'Later' }).click();

    await expect(popup.locator('#realm-input')).toBeVisible();
  });

  test('should lock and unlock', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await popup.getByRole('button', { name: 'Start with Password' }).click();
    await popup.getByPlaceholder('Create master password').fill('testpassword123');
    await popup.getByPlaceholder('Confirm password').fill('testpassword123');
    await popup.getByRole('button', { name: 'Create Seed' }).click();

    await expect(popup.getByText('Backup Your Seed')).toBeVisible({ timeout: 5000 });
    await popup.getByRole('button', { name: 'Later' }).click();

    await popup.getByRole('button', { name: 'Lock' }).click();

    await expect(popup.getByPlaceholder('Enter master password')).toBeVisible();

    await popup.getByPlaceholder('Enter master password').fill('testpassword123');
    await popup.getByRole('button', { name: 'Unlock' }).click();

    await expect(popup.locator('#realm-input')).toBeVisible({ timeout: 5000 });
  });
});
