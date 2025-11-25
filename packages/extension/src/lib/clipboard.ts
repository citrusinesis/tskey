const CLEAR_TIMEOUT_MS = 30 * 1000;

let clearTimeoutId: ReturnType<typeof setTimeout> | null = null;
let lastCopiedText: string | null = null;

export async function copyWithAutoClear(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  lastCopiedText = text;

  if (clearTimeoutId !== null) {
    clearTimeout(clearTimeoutId);
  }

  clearTimeoutId = setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === lastCopiedText) {
        await navigator.clipboard.writeText('');
      }
    } catch {
      // Clipboard access may fail silently
    }
    clearTimeoutId = null;
    lastCopiedText = null;
  }, CLEAR_TIMEOUT_MS);
}
