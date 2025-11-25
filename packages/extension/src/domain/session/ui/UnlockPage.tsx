import { useState } from 'react';

import { PasswordInput } from '../../../components';
import type { UnlockMethod } from '../../messaging';
import { getPrfUnavailableMessage, usePrfSupport } from '../../prf';

type Props = {
  unlockMethod: UnlockMethod;
  onUnlock: (password: string) => void;
  onUnlockWithPrf: () => void;
  onImport: (seed: Uint8Array, password: string) => void;
  isLoading: boolean;
  error: string | null;
};

export function UnlockPage({
  unlockMethod,
  onUnlock,
  onUnlockWithPrf,
  onImport,
  isLoading,
  error,
}: Props) {
  const [password, setPassword] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const prfSupport = usePrfSupport();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onUnlock(password);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);

    if (!importPassword) {
      setValidationError('Enter a master password first');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const seed = new Uint8Array(buffer);

      if (seed.length !== 256) {
        setValidationError('Invalid seed file (must be 256 bytes)');
        return;
      }

      onImport(seed, importPassword);
    } catch {
      setValidationError('Failed to read file');
    }
  };

  if (showImport) {
    return (
      <div className="space-y-4">
        <div className="rounded bg-amber-50 p-3 text-xs text-amber-700">
          Lost access? Import your seed file to restore passwords.
        </div>

        <div>
          <label htmlFor="import-password" className="mb-1 block text-xs text-gray-500">
            New Master Password
          </label>
          <PasswordInput
            id="import-password"
            value={importPassword}
            onChange={setImportPassword}
            placeholder="Create new master password"
          />
          <p className="mt-1 text-xs text-gray-400">Can be different from your original password</p>
        </div>

        <div>
          <label htmlFor="seed-file" className="mb-1 block text-xs text-gray-500">
            Seed File
          </label>
          <input
            id="seed-file"
            type="file"
            accept=".key"
            onChange={handleFileSelect}
            disabled={isLoading}
            className="w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {(error ?? validationError) && (
          <p className="text-xs text-red-500">{error ?? validationError}</p>
        )}

        <button
          type="button"
          onClick={() => setShowImport(false)}
          className="w-full text-xs text-gray-500 hover:text-gray-700"
        >
          Back to unlock
        </button>
      </div>
    );
  }

  if (unlockMethod === 'prf') {
    if (!prfSupport.isChecking && !prfSupport.isSupported) {
      return (
        <div className="space-y-4">
          <div className="rounded bg-amber-50 p-3 text-xs text-amber-700">
            {getPrfUnavailableMessage(prfSupport.reason)}
          </div>

          <div className="rounded bg-blue-50 p-3 text-xs text-blue-700">
            Your account was set up with biometrics. To access on this browser, import your seed
            file.
          </div>

          <div>
            <label htmlFor="import-password" className="mb-1 block text-xs text-gray-500">
              New Master Password
            </label>
            <PasswordInput
              id="import-password"
              value={importPassword}
              onChange={setImportPassword}
              placeholder="Create new master password"
            />
          </div>

          <div>
            <label htmlFor="seed-file" className="mb-1 block text-xs text-gray-500">
              Seed File
            </label>
            <input
              id="seed-file"
              type="file"
              accept=".key"
              onChange={handleFileSelect}
              disabled={isLoading}
              className="w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {(error ?? validationError) && (
            <p className="text-xs text-red-500">{error ?? validationError}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded bg-green-50 p-3 text-xs text-green-700">
          Use biometric authentication to unlock.
        </div>

        <button
          type="button"
          onClick={onUnlockWithPrf}
          disabled={isLoading || prfSupport.isChecking}
          className="w-full rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? 'Authenticating...' : 'Unlock with Biometrics'}
        </button>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="w-full text-xs text-gray-500 hover:text-gray-700"
          >
            Lost access? Import seed file
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleUnlock} className="space-y-4">
      <div>
        <label htmlFor="master-password" className="mb-1 block text-xs text-gray-500">
          Master Password
        </label>
        <PasswordInput
          id="master-password"
          value={password}
          onChange={setPassword}
          placeholder="Enter master password"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isLoading || !password}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Unlocking...' : 'Unlock'}
      </button>

      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="w-full text-xs text-gray-500 hover:text-gray-700"
        >
          Lost access? Import seed file
        </button>
      </div>
    </form>
  );
}
