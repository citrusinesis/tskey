import { useState } from 'react';

import { PasswordInput } from '../components';

type Props = {
  onUnlock: (password: string) => void;
  isLoading: boolean;
  error: string | null;
};

export function UnlockPage({ onUnlock, isLoading, error }: Props) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onUnlock(password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
