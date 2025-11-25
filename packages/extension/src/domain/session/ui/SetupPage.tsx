import { useState } from 'react';

import { PasswordInput } from '../../../components';

type Props = {
  onSetup: (password: string) => void;
  onImport: (seed: Uint8Array, password: string) => void;
  isLoading: boolean;
  error: string | null;
};

export function SetupPage({ onSetup, onImport, isLoading, error }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!password) {
      setValidationError('Password is required');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    onSetup(password);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);

    if (!password) {
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

      onImport(seed, password);
    } catch {
      setValidationError('Failed to read file');
    }
  };

  if (showImport) {
    return (
      <div className="space-y-4">
        <div className="rounded bg-blue-50 p-3 text-xs text-blue-700">
          Import an existing seed file to restore your passwords.
        </div>

        <div>
          <label htmlFor="master-password" className="mb-1 block text-xs text-gray-500">
            Master Password
          </label>
          <PasswordInput
            id="master-password"
            value={password}
            onChange={setPassword}
            placeholder="Create master password"
          />
          <p className="mt-1 text-xs text-gray-400">Can be different from your original password</p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Seed File</label>
          <input
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
          Back to setup
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSetup} className="space-y-4">
      <div className="rounded bg-blue-50 p-3 text-xs text-blue-700">
        First time? Create a master password to generate your secure seed.
      </div>

      <div>
        <label htmlFor="master-password" className="mb-1 block text-xs text-gray-500">
          Master Password
        </label>
        <PasswordInput
          id="master-password"
          value={password}
          onChange={setPassword}
          placeholder="Create master password"
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-xs text-gray-500">
          Confirm Password
        </label>
        <PasswordInput
          id="confirm-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirm password"
        />
      </div>

      {(error ?? validationError) && (
        <p className="text-xs text-red-500">{error ?? validationError}</p>
      )}

      <button
        type="submit"
        disabled={isLoading || !password || !confirmPassword}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Setting up...' : 'Create Seed'}
      </button>

      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="w-full text-xs text-gray-500 hover:text-gray-700"
        >
          Import existing seed file
        </button>
      </div>
    </form>
  );
}
