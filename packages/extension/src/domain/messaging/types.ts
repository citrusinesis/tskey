export type UnlockMessage = { type: 'UNLOCK'; payload: { password: string } };
export type UnlockWithPrfKeyMessage = {
  type: 'UNLOCK_WITH_PRF_KEY';
  payload: { prfKey: number[] };
};
export type LockMessage = { type: 'LOCK' };
export type GetStatusMessage = { type: 'GET_STATUS' };
export type GenerateMessage = { type: 'GENERATE'; payload: { realm: string } };
export type GetCurrentRealmMessage = { type: 'GET_CURRENT_REALM' };
export type FillMessage = { type: 'FILL'; payload: { password: string } };
export type SetupSeedMessage = { type: 'SETUP_SEED'; payload: { password: string } };
export type SetupWithPrfKeyMessage = {
  type: 'SETUP_WITH_PRF_KEY';
  payload: { prfKey: number[]; credentialId: string; salt: string };
};
export type HasSeedMessage = { type: 'HAS_SEED' };
export type ExportSeedMessage = { type: 'EXPORT_SEED' };
export type ImportSeedMessage = {
  type: 'IMPORT_SEED';
  payload: { seed: number[]; password: string };
};
export type GetSeedExportedMessage = { type: 'GET_SEED_EXPORTED' };
export type SetSeedExportedMessage = { type: 'SET_SEED_EXPORTED'; payload: { exported: boolean } };

export type Message =
  | UnlockMessage
  | UnlockWithPrfKeyMessage
  | LockMessage
  | GetStatusMessage
  | GenerateMessage
  | GetCurrentRealmMessage
  | FillMessage
  | SetupSeedMessage
  | SetupWithPrfKeyMessage
  | HasSeedMessage
  | ExportSeedMessage
  | ImportSeedMessage
  | GetSeedExportedMessage
  | SetSeedExportedMessage;

export type SuccessResponse<T> = { success: true; data: T };
export type ErrorResponse = { success: false; error: string };
export type Response<T = unknown> = SuccessResponse<T> | ErrorResponse;

export type UnlockMethod = 'password' | 'prf';
export type PrfConfigData = {
  credentialId: string;
  salt: string;
};
export type SessionStatus = {
  isUnlocked: boolean;
  hasSeed: boolean;
  seedExported: boolean;
  unlockMethod: UnlockMethod;
  prfConfig?: PrfConfigData;
};
export type GenerateResult = { password: string };
export type RealmResult = { realm: string };
export type HasSeedResult = { hasSeed: boolean };
export type ExportSeedResult = { seed: number[] };
export type SeedExportedResult = { seedExported: boolean };
