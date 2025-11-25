import type {
  ExportSeedResult,
  GenerateResult,
  HasSeedResult,
  Message,
  RealmResult,
  Response,
  SeedExportedResult,
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

export async function exportSeed(): Promise<Response<ExportSeedResult>> {
  return sendMessage({ type: 'EXPORT_SEED' });
}

export async function importSeed(seed: number[], password: string): Promise<Response<void>> {
  return sendMessage({ type: 'IMPORT_SEED', payload: { seed, password } });
}

export async function getSeedExported(): Promise<Response<SeedExportedResult>> {
  return sendMessage({ type: 'GET_SEED_EXPORTED' });
}

export async function setSeedExported(exported: boolean): Promise<Response<void>> {
  return sendMessage({ type: 'SET_SEED_EXPORTED', payload: { exported } });
}
