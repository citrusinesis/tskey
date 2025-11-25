import { useState } from 'react';

import { PasswordInput } from '../components';

type Props = {
  hasSeed: boolean;
  onUnlock: (password: string) => void;
  onSetupSeed: (password: string) => void;
  isLoading: boolean;
  error: string | null;
};

export function UnlockPage({ hasSeed, onUnlock, onSetupSeed, isLoading, error }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onUnlock(password);
    }
  };

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

    onSetupSeed(password);
  };

  if (!hasSeed) {
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
      </form>
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
    </form>
  );
}
