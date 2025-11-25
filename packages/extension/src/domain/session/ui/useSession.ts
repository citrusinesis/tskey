import { useCallback, useEffect, useState } from 'react';

import {
  exportSeed as sendExportSeed,
  getStatus,
  importSeed as sendImportSeed,
  lock as sendLock,
  setSeedExported as sendSetSeedExported,
  setupSeed as sendSetupSeed,
  setupWithPrfKey as sendSetupWithPrfKey,
  unlock as sendUnlock,
  unlockWithPrfKey as sendUnlockWithPrfKey,
} from '../../messaging';
import type { PrfConfigData, UnlockMethod } from '../../messaging';
import { createPasskey, derivePrfKey } from '../../prf';

type SessionState = {
  isUnlocked: boolean;
  hasSeed: boolean;
  seedExported: boolean;
  unlockMethod: UnlockMethod;
  prfConfig?: PrfConfigData;
  isLoading: boolean;
  error: string | null;
};

export function useSession() {
  const [state, setState] = useState<SessionState>({
    isUnlocked: false,
    hasSeed: false,
    seedExported: false,
    unlockMethod: 'password',
    prfConfig: undefined,
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
        unlockMethod: response.data.unlockMethod,
        prfConfig: response.data.prfConfig,
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

  const unlockWithPrf = useCallback(async () => {
    if (!state.prfConfig) {
      setState((prev) => ({ ...prev, error: 'PRF not configured' }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { prfKey } = await derivePrfKey(state.prfConfig.credentialId, state.prfConfig.salt);
      const response = await sendUnlockWithPrfKey(Array.from(prfKey));

      if (response.success) {
        setState((prev) => ({ ...prev, isUnlocked: true, isLoading: false, error: null }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: response.error }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to authenticate',
      }));
    }
  }, [state.prfConfig]);

  const setupSeed = useCallback(async (password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const response = await sendSetupSeed(password);
    if (response.success) {
      setState((prev) => ({
        ...prev,
        isUnlocked: true,
        hasSeed: true,
        seedExported: false,
        unlockMethod: 'password',
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

  const setupWithPrf = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { credentialId, salt } = await createPasskey(userId);
      const { prfKey } = await derivePrfKey(credentialId, salt);
      const response = await sendSetupWithPrfKey(Array.from(prfKey), credentialId, salt);

      if (response.success) {
        setState((prev) => ({
          ...prev,
          isUnlocked: true,
          hasSeed: true,
          seedExported: false,
          unlockMethod: 'prf',
          prfConfig: { credentialId, salt },
          isLoading: false,
          error: null,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: response.error }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to create passkey',
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
        unlockMethod: 'password',
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
    unlockWithPrf,
    setupSeed,
    setupWithPrf,
    lock,
    checkStatus,
    exportSeed,
    dismissExportReminder,
    importSeed,
  };
}
