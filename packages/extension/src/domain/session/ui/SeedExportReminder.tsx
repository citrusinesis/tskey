type Props = {
  onExport: () => void;
  onDismiss: () => void;
};

export function SeedExportReminder({ onExport, onDismiss }: Props) {
  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-3">
      <p className="mb-2 text-xs font-medium text-amber-800">Backup Your Seed</p>
      <p className="mb-3 text-xs text-amber-700">
        Export your seed file for recovery. Without it, you cannot regenerate your passwords if you
        lose access.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onExport}
          className="flex-1 rounded bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-700"
        >
          Export Now
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-100"
        >
          Later
        </button>
      </div>
    </div>
  );
}
