export type UnlockMessage = { type: 'UNLOCK'; payload: { password: string } };
export type LockMessage = { type: 'LOCK' };
export type GetStatusMessage = { type: 'GET_STATUS' };
export type GenerateMessage = { type: 'GENERATE'; payload: { realm: string } };
export type GetCurrentRealmMessage = { type: 'GET_CURRENT_REALM' };
export type FillMessage = { type: 'FILL'; payload: { password: string } };

export type Message =
  | UnlockMessage
  | LockMessage
  | GetStatusMessage
  | GenerateMessage
  | GetCurrentRealmMessage
  | FillMessage;

export type SuccessResponse<T> = { success: true; data: T };
export type ErrorResponse = { success: false; error: string };
export type Response<T = unknown> = SuccessResponse<T> | ErrorResponse;

export type SessionStatus = { isUnlocked: boolean };
export type GenerateResult = { password: string };
export type RealmResult = { realm: string };
