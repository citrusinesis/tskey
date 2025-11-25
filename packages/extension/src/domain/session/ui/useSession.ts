import { useCallback, useEffect, useState } from 'react';

import {
  exportSeed as sendExportSeed,
  getStatus,
  importSeed as sendImportSeed,
  lock as sendLock,
  setSeedExported as sendSetSeedExported,
  setupSeed as sendSetupSeed,
  unlock as sendUnlock,
} from '../../messaging';

type SessionState = {
  isUnlocked: boolean;
  hasSeed: boolean;
  seedExported: boolean;
  isLoading: boolean;
  error: string | null;
};

export function useSession() {
  const [state, setState] = useState<SessionState>({
    isUnlocked: false,
    hasSeed: false,
    seedExported: false,
    isLoading: true,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    const response = await getStatus();
    if (response.success) {
      setState((prev) => ({
        ...prev,
        isUnlocked: response.data.isUnlocked,
        hasSeed: response.data.hasSeed,
        seedExported: response.data.seedExported,
        isLoading: false,
      }));
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const unlock = useCallback(async (password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const response = await sendUnlock(password);
    if (response.success) {
      setState((prev) => ({ ...prev, isUnlocked: true, isLoading: false, error: null }));
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: response.error,
      }));
    }
  }, []);

  const setupSeed = useCallback(async (password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const response = await sendSetupSeed(password);
    if (response.success) {
      setState((prev) => ({
        ...prev,
        isUnlocked: true,
        hasSeed: true,
        seedExported: false,
        isLoading: false,
        error: null,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: response.error,
      }));
    }
  }, []);

  const lock = useCallback(async () => {
    await sendLock();
    setState((prev) => ({ ...prev, isUnlocked: false, isLoading: false, error: null }));
  }, []);

  const exportSeed = useCallback(async (): Promise<Uint8Array | null> => {
    const response = await sendExportSeed();
    if (response.success) {
      await sendSetSeedExported(true);
      setState((prev) => ({ ...prev, seedExported: true }));
      return new Uint8Array(response.data.seed);
    }
    return null;
  }, []);

  const dismissExportReminder = useCallback(async () => {
    await sendSetSeedExported(true);
    setState((prev) => ({ ...prev, seedExported: true }));
  }, []);

  const importSeed = useCallback(async (seed: Uint8Array, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const response = await sendImportSeed(Array.from(seed), password);
    if (response.success) {
      setState((prev) => ({
        ...prev,
        isUnlocked: true,
        hasSeed: true,
        seedExported: true,
        isLoading: false,
        error: null,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: response.error,
      }));
    }
  }, []);

  return {
    ...state,
    unlock,
    setupSeed,
    lock,
    checkStatus,
    exportSeed,
    dismissExportReminder,
    importSeed,
  };
}
