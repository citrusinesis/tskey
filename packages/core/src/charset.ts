export const CHARSET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890`~!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?';

export const LOWER = 'abcdefghijklmnopqrstuvwxyz';
export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const DIGITS = '1234567890';
export const SPECIAL = '`~!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?';

/** Select character using rejection sampling for uniform distribution */
export function randChar(
  bytes: Uint8Array,
  offset: number,
  charset: string,
): { char: string; consumed: number } {
  const max = charset.length;
  const buck = Math.floor(255 / max);
  const rem = 255 % max;

  let i = offset;
  while (i < bytes.length) {
    const b = bytes[i]!;
    i++;
    if (b >= 255 - rem) continue; // reject
    return { char: charset[Math.floor(b / buck)]!, consumed: i - offset };
  }
  throw new Error('Not enough random bytes');
}
