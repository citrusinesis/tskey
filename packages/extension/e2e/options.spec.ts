import { test, expect } from './fixtures';

test.describe('Options Page', () => {
  test('should display settings page', async ({ context, extensionId }) => {
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);

    await expect(options.getByRole('heading', { name: 'TSKey Settings' })).toBeVisible();
    await expect(options.getByRole('heading', { name: 'Security' })).toBeVisible();
    await expect(options.getByRole('heading', { name: 'Password Generation' })).toBeVisible();
    await expect(options.getByRole('heading', { name: 'Autofill' })).toBeVisible();
    await expect(options.getByRole('heading', { name: 'Danger Zone' })).toBeVisible();
  });

  test('should update auto-lock setting', async ({ context, extensionId }) => {
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);

    const autoLockSelect = options.locator('#auto-lock');
    await autoLockSelect.selectOption('30');

    await expect(autoLockSelect).toHaveValue('30');
  });

  test('should update clipboard clear setting', async ({ context, extensionId }) => {
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);

    const clipboardSelect = options.locator('#clipboard-clear');
    await clipboardSelect.selectOption('60');

    await expect(clipboardSelect).toHaveValue('60');
  });

  test('should update password length setting', async ({ context, extensionId }) => {
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);

    const lengthSelect = options.locator('#password-length');
    await lengthSelect.selectOption('24');

    await expect(lengthSelect).toHaveValue('24');
  });

  test('should toggle autofill setting', async ({ context, extensionId }) => {
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);

    const toggle = options.getByRole('switch');
    const initialState = await toggle.getAttribute('aria-checked');

    await toggle.click();

    await expect(toggle).toHaveAttribute(
      'aria-checked',
      initialState === 'true' ? 'false' : 'true',
    );
  });
});
