type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function RealmDisplay({ value, onChange }: Props) {
  return (
    <div>
      <label htmlFor="realm-input" className="mb-1 block text-xs text-gray-500">
        Realm
      </label>
      <input
        id="realm-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}
