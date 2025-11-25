import { useSettings } from '../../domain/settings';

const AUTO_LOCK_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
];

const CLIPBOARD_OPTIONS = [
  { value: 0, label: 'Never clear' },
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
];

const PASSWORD_LENGTH_OPTIONS = [12, 16, 20, 24, 32];

function App() {
  const { settings, isLoading, isSaving, updateSettings } = useSettings();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">TSKey Settings</h1>
        <p className="text-gray-600">Configure your password manager</p>
      </header>

      <div className="space-y-8">
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Security</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="auto-lock" className="mb-1 block text-sm font-medium text-gray-700">
                Auto-lock after inactivity
              </label>
              <select
                id="auto-lock"
                value={settings.autoLockMinutes}
                onChange={(e) => updateSettings({ autoLockMinutes: Number(e.target.value) })}
                disabled={isSaving}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {AUTO_LOCK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Automatically lock TSKey after this period of inactivity
              </p>
            </div>

            <div>
              <label
                htmlFor="clipboard-clear"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Clear clipboard after
              </label>
              <select
                id="clipboard-clear"
                value={settings.clipboardClearSeconds}
                onChange={(e) => updateSettings({ clipboardClearSeconds: Number(e.target.value) })}
                disabled={isSaving}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {CLIPBOARD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Automatically clear copied passwords from clipboard
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Password Generation</h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="password-length"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Default password length
              </label>
              <select
                id="password-length"
                value={settings.defaultPasswordLength}
                onChange={(e) => updateSettings({ defaultPasswordLength: Number(e.target.value) })}
                disabled={isSaving}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PASSWORD_LENGTH_OPTIONS.map((length) => (
                  <option key={length} value={length}>
                    {length} characters
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Autofill</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Enable autofill</p>
              <p className="text-xs text-gray-500">Show autofill dropdown on password fields</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoFillEnabled}
              onClick={() => updateSettings({ autoFillEnabled: !settings.autoFillEnabled })}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoFillEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoFillEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-red-900">Danger Zone</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Reset all data</p>
                <p className="text-xs text-red-600">
                  Delete all stored data including your encrypted seed
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Are you sure? This will delete all your data including your seed. This cannot be undone!',
                    )
                  ) {
                    chrome.storage.local.clear().then(() => {
                      window.location.reload();
                    });
                  }
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Reset
              </button>
            </div>
          </div>
        </section>
      </div>

      {isSaving && (
        <div className="fixed bottom-4 right-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white">
          Saving...
        </div>
      )}
    </div>
  );
}

export default App;
