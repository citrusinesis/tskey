import { generate, getRealm } from '../domain/generator';
import { createMessageRouter, type Message, type MessageHandler } from '../domain/messaging';
import {
  exportSeed,
  getDecryptedSeed,
  getMasterPassword,
  hasSeedStored,
  importSeed,
  isSeedExported,
  isUnlocked,
  lock,
  markSeedExported,
  setupSeed,
  setupSessionWithPrfKey,
  unlockSession,
  unlockSessionWithPrfKey,
} from '../domain/session';
import { getPrfConfig, getSettings, getUnlockMethod } from '../domain/storage';

const AUTO_LOCK_ALARM_NAME = 'auto-lock-check';
let lastActivityTime = Date.now();

const handlers: Record<Message['type'], MessageHandler> = {
  UNLOCK: async (message) => {
    if (message.type !== 'UNLOCK') {
      return { success: false, error: 'Invalid message' };
    }

    try {
      await unlockSession(message.payload.password);
      resetActivityTimer();
      await startAutoLockAlarm();
      return { success: true, data: undefined };
    } catch {
      return { success: false, error: 'Invalid password' };
    }
  },

  UNLOCK_WITH_PRF_KEY: async (message) => {
    if (message.type !== 'UNLOCK_WITH_PRF_KEY') {
      return { success: false, error: 'Invalid message' };
    }

    try {
      const prfKey = new Uint8Array(message.payload.prfKey);
      await unlockSessionWithPrfKey(prfKey);
      resetActivityTimer();
      await startAutoLockAlarm();
      return { success: true, data: undefined };
    } catch {
      return { success: false, error: 'Failed to unlock with PRF' };
    }
  },

  LOCK: async () => {
    lock();
    await stopAutoLockAlarm();
    return { success: true, data: undefined };
  },

  GET_STATUS: async () => {
    const seedExists = await hasSeedStored();
    const seedExported = await isSeedExported();
    const unlockMethod = await getUnlockMethod();
    const prfConfig = await getPrfConfig();
    return {
      success: true,
      data: {
        isUnlocked: isUnlocked(),
        hasSeed: seedExists,
        seedExported,
        unlockMethod,
        prfConfig: prfConfig ?? undefined,
      },
    };
  },

  GENERATE: async (message) => {
    if (message.type !== 'GENERATE') {
      return { success: false, error: 'Invalid message' };
    }

    const masterPassword = getMasterPassword();
    if (!masterPassword) {
      return { success: false, error: 'Session locked' };
    }

    resetActivityTimer();
    const seed = getDecryptedSeed();
    const password = await generate(masterPassword, message.payload.realm, seed ?? undefined);
    return { success: true, data: { password } };
  },

  GET_CURRENT_REALM: async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.url) {
      return { success: false, error: 'No active tab' };
    }
    const realm = getRealm(tab.url);
    return { success: true, data: { realm } };
  },

  SETUP_SEED: async (message) => {
    if (message.type !== 'SETUP_SEED') {
      return { success: false, error: 'Invalid message' };
    }

    await setupSeed(message.payload.password);
    return { success: true, data: undefined };
  },

  SETUP_WITH_PRF_KEY: async (message) => {
    if (message.type !== 'SETUP_WITH_PRF_KEY') {
      return { success: false, error: 'Invalid message' };
    }

    try {
      const prfKey = new Uint8Array(message.payload.prfKey);
      await setupSessionWithPrfKey(prfKey, message.payload.credentialId, message.payload.salt);
      return { success: true, data: undefined };
    } catch {
      return { success: false, error: 'Failed to setup with PRF' };
    }
  },

  HAS_SEED: async () => {
    const exists = await hasSeedStored();
    return { success: true, data: { hasSeed: exists } };
  },

  EXPORT_SEED: async () => {
    try {
      const seed = await exportSeed();
      return { success: true, data: { seed: Array.from(seed) } };
    } catch {
      return { success: false, error: 'Session not unlocked' };
    }
  },

  IMPORT_SEED: async (message) => {
    if (message.type !== 'IMPORT_SEED') {
      return { success: false, error: 'Invalid message' };
    }

    try {
      const seed = new Uint8Array(message.payload.seed);
      await importSeed(seed, message.payload.password);
      return { success: true, data: undefined };
    } catch {
      return { success: false, error: 'Failed to import seed' };
    }
  },

  GET_SEED_EXPORTED: async () => {
    const exported = await isSeedExported();
    return { success: true, data: { seedExported: exported } };
  },

  SET_SEED_EXPORTED: async (message) => {
    if (message.type !== 'SET_SEED_EXPORTED') {
      return { success: false, error: 'Invalid message' };
    }

    await markSeedExported();
    return { success: true, data: undefined };
  },

  FILL: async () => {
    return { success: false, error: 'FILL should be sent to content script' };
  },
};

function resetActivityTimer() {
  lastActivityTime = Date.now();
}

async function startAutoLockAlarm() {
  const settings = await getSettings();
  if (settings.autoLockMinutes === 0) {
    await stopAutoLockAlarm();
    return;
  }

  await chrome.alarms.create(AUTO_LOCK_ALARM_NAME, {
    periodInMinutes: 1,
  });
}

async function stopAutoLockAlarm() {
  await chrome.alarms.clear(AUTO_LOCK_ALARM_NAME);
}

async function checkAutoLock() {
  if (!isUnlocked()) return;

  const settings = await getSettings();
  if (settings.autoLockMinutes === 0) return;

  const elapsedMinutes = (Date.now() - lastActivityTime) / 1000 / 60;
  if (elapsedMinutes >= settings.autoLockMinutes) {
    lock();
    await stopAutoLockAlarm();
  }
}

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener(createMessageRouter(handlers));

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === AUTO_LOCK_ALARM_NAME) {
      checkAutoLock();
    }
  });
});
