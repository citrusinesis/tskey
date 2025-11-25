import { CopyButton } from '../../../components';
import { RealmDisplay } from './RealmDisplay';

type Props = {
  realm: string;
  password: string | null;
  isGenerating: boolean;
  error: string | null;
  onRealmChange: (realm: string) => void;
  onGenerate: () => void;
  onFill: () => void;
  onLock: () => void;
};

export function GeneratorPage({
  realm,
  password,
  isGenerating,
  error,
  onRealmChange,
  onGenerate,
  onFill,
  onLock,
}: Props) {
  return (
    <div className="space-y-4">
      <RealmDisplay value={realm} onChange={onRealmChange} />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || !realm}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isGenerating ? 'Generating...' : 'Generate'}
      </button>

      {password && (
        <div className="space-y-2 rounded bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <code className="text-xs break-all">{password}</code>
          </div>
          <div className="flex gap-2">
            <CopyButton text={password} />
            <button
              type="button"
              onClick={onFill}
              className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
            >
              Fill
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onLock}
        className="w-full rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        Lock
      </button>
    </div>
  );
}
