export interface PasswordSpec {
  length: number;
  upper: number;
  lower: number;
  digits: number;
  special: number;
  allowedSpecial?: string;
}

export interface GenerateOptions {
  masterPassword: string;
  realm: string;
  spec?: Partial<PasswordSpec>;
}

export const DEFAULT_SPEC: PasswordSpec = {
  length: 16,
  upper: 1,
  lower: 1,
  digits: 1,
  special: 1,
};
