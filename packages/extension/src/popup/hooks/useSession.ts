import { useCallback, useEffect, useState } from 'react';

import {
  getStatus,
  lock as sendLock,
  setupSeed as sendSetupSeed,
  unlock as sendUnlock,
} from '../../domain/messaging';

type SessionState = {
  isUnlocked: boolean;
  hasSeed: boolean;
  isLoading: boolean;
  error: string | null;
};

export function useSession() {
  const [state, setState] = useState<SessionState>({
    isUnlocked: false,
    hasSeed: false,
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
      setState((prev) => ({ ...prev, isUnlocked: true, hasSeed: true, isLoading: false, error: null }));
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

  return {
    ...state,
    unlock,
    setupSeed,
    lock,
    checkStatus,
  };
}
