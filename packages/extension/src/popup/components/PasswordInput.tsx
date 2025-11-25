import { useState } from 'react';

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function PasswordInput({ id, value, onChange, placeholder = 'Password' }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
}
