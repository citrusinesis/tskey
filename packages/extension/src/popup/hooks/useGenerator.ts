import { useCallback, useEffect, useState } from 'react';

import { getCurrentRealm, sendFillToTab, generate as sendGenerate } from '../../domain/messaging';

type GeneratorState = {
  realm: string;
  password: string | null;
  isGenerating: boolean;
  error: string | null;
};

export function useGenerator() {
  const [state, setState] = useState<GeneratorState>({
    realm: '',
    password: null,
    isGenerating: false,
    error: null,
  });

  useEffect(() => {
    getCurrentRealm().then((response) => {
      if (response.success) {
        setState((prev) => ({ ...prev, realm: response.data.realm }));
      }
    });
  }, []);

  const setRealm = useCallback((realm: string) => {
    setState((prev) => ({ ...prev, realm, password: null }));
  }, []);

  const generate = useCallback(async () => {
    if (!state.realm) {
      setState((prev) => ({ ...prev, error: 'Realm is required' }));
      return;
    }

    setState((prev) => ({ ...prev, isGenerating: true, error: null }));
    const response = await sendGenerate(state.realm);

    if (response.success) {
      setState((prev) => ({
        ...prev,
        password: response.data.password,
        isGenerating: false,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: response.error,
      }));
    }
  }, [state.realm]);

  const fill = useCallback(async () => {
    if (!state.password) return;

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) return;

    await sendFillToTab(tab.id, state.password);
    window.close();
  }, [state.password]);

  const clear = useCallback(() => {
    setState((prev) => ({ ...prev, password: null }));
  }, []);

  return {
    ...state,
    setRealm,
    generate,
    fill,
    clear,
  };
}
