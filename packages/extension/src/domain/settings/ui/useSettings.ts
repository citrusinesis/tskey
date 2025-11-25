import { useCallback, useEffect, useState } from 'react';

import { getSettings, setSettings } from '../../storage';
import type { StorageSettings } from '../../storage/types';
import { DEFAULT_SETTINGS } from '../../storage/types';

type SettingsState = {
  settings: StorageSettings;
  isLoading: boolean;
  isSaving: boolean;
};

export function useSettings() {
  const [state, setState] = useState<SettingsState>({
    settings: DEFAULT_SETTINGS,
    isLoading: true,
    isSaving: false,
  });

  useEffect(() => {
    getSettings()
      .then((settings) => {
        setState((prev) => ({ ...prev, settings, isLoading: false }));
      })
      .catch(() => {
        setState((prev) => ({ ...prev, isLoading: false }));
      });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<StorageSettings>) => {
    setState((prev) => ({ ...prev, isSaving: true }));
    try {
      await setSettings(updates);
      const newSettings = await getSettings();
      setState((prev) => ({ ...prev, settings: newSettings, isSaving: false }));
    } catch {
      setState((prev) => ({ ...prev, isSaving: false }));
    }
  }, []);

  return {
    ...state,
    updateSettings,
  };
}
