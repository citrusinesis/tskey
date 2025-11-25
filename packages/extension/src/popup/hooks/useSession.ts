import { useCallback, useEffect, useState } from 'react';

import { getStatus, lock as sendLock, unlock as sendUnlock } from '../../messaging';

type SessionState = {
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;
};

export function useSession() {
  const [state, setState] = useState<SessionState>({
    isUnlocked: false,
    isLoading: true,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    const response = await getStatus();
    if (response.success) {
      setState((prev) => ({
        ...prev,
        isUnlocked: response.data.isUnlocked,
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
      setState({ isUnlocked: true, isLoading: false, error: null });
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
    setState({ isUnlocked: false, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    unlock,
    lock,
    checkStatus,
  };
}
