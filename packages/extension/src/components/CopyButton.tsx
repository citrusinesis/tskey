import { useCallback, useState } from 'react';

import { copyWithAutoClear } from '../lib/clipboard';

type Props = {
  text: string;
  onCopy?: () => void;
};

export function CopyButton({ text, onCopy }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await copyWithAutoClear(text);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  }, [text, onCopy]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
