import { CHARSET, DIGITS, LOWER, randChar, SPECIAL, UPPER } from './charset';
import { createDRNG, createDRNGWithSeed } from './csprng';
import type { GenerateOptions, PasswordSpec } from './types';
import { DEFAULT_SPEC } from './types';

export async function generatePassword(options: GenerateOptions): Promise<string> {
  const spec = { ...DEFAULT_SPEC, ...options.spec };
  const drng = options.seed
    ? await createDRNGWithSeed(options.seed, options.realm)
    : await createDRNG(options.masterPassword, options.realm);

  while (true) {
    const bytes = await drng.read(spec.length * 4);
    const { password } = Array.from({ length: spec.length }).reduce<{
      password: string;
      offset: number;
    }>(
      (acc) => {
        const result = randChar(bytes, acc.offset, CHARSET);
        return {
          password: acc.password + result.char,
          offset: acc.offset + result.consumed,
        };
      },
      { password: '', offset: 0 },
    );

    if (isCompliant(password, spec)) {
      return password;
    }
  }
}

function isCompliant(password: string, spec: PasswordSpec): boolean {
  const counts = [...password].reduce(
    (acc, c) => ({
      upper: acc.upper + (UPPER.includes(c) ? 1 : 0),
      lower: acc.lower + (LOWER.includes(c) ? 1 : 0),
      digits: acc.digits + (DIGITS.includes(c) ? 1 : 0),
      special: acc.special + (SPECIAL.includes(c) ? 1 : 0),
    }),
    { upper: 0, lower: 0, digits: 0, special: 0 },
  );

  return (
    counts.upper >= spec.upper &&
    counts.lower >= spec.lower &&
    counts.digits >= spec.digits &&
    counts.special >= spec.special
  );
}
