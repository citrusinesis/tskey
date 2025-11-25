import type {
  GenerateResult,
  HasSeedResult,
  Message,
  RealmResult,
  Response,
  SessionStatus,
} from './types';

export async function sendMessage<T>(message: Message): Promise<Response<T>> {
  return chrome.runtime.sendMessage(message);
}

export async function unlock(password: string): Promise<Response<void>> {
  return sendMessage({ type: 'UNLOCK', payload: { password } });
}

export async function lock(): Promise<Response<void>> {
  return sendMessage({ type: 'LOCK' });
}

export async function getStatus(): Promise<Response<SessionStatus>> {
  return sendMessage({ type: 'GET_STATUS' });
}

export async function generate(realm: string): Promise<Response<GenerateResult>> {
  return sendMessage({ type: 'GENERATE', payload: { realm } });
}

export async function getCurrentRealm(): Promise<Response<RealmResult>> {
  return sendMessage({ type: 'GET_CURRENT_REALM' });
}

export async function setupSeed(password: string): Promise<Response<void>> {
  return sendMessage({ type: 'SETUP_SEED', payload: { password } });
}

export async function hasSeed(): Promise<Response<HasSeedResult>> {
  return sendMessage({ type: 'HAS_SEED' });
}

export async function sendFillToTab(tabId: number, password: string): Promise<Response<void>> {
  return chrome.tabs.sendMessage(tabId, {
    type: 'FILL',
    payload: { password },
  });
}
