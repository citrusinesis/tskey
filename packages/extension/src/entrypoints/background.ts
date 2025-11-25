import { generate, getRealm } from '../domain/generator';
import { createMessageRouter, type Message, type MessageHandler } from '../domain/messaging';
import {
  getDecryptedSeed,
  getMasterPassword,
  hasSeedStored,
  isUnlocked,
  lock,
  setupSeed,
  unlockSession,
} from '../domain/session';

const handlers: Record<Message['type'], MessageHandler> = {
  UNLOCK: async (message) => {
    if (message.type !== 'UNLOCK') {
      return { success: false, error: 'Invalid message' };
    }

    try {
      await unlockSession(message.payload.password);
      return { success: true, data: undefined };
    } catch {
      return { success: false, error: 'Invalid password' };
    }
  },

  LOCK: async () => {
    lock();
    return { success: true, data: undefined };
  },

  GET_STATUS: async () => {
    const seedExists = await hasSeedStored();
    return { success: true, data: { isUnlocked: isUnlocked(), hasSeed: seedExists } };
  },

  GENERATE: async (message) => {
    if (message.type !== 'GENERATE') {
      return { success: false, error: 'Invalid message' };
    }

    const masterPassword = getMasterPassword();
    if (!masterPassword) {
      return { success: false, error: 'Session locked' };
    }

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

  HAS_SEED: async () => {
    const exists = await hasSeedStored();
    return { success: true, data: { hasSeed: exists } };
  },

  FILL: async () => {
    return { success: false, error: 'FILL should be sent to content script' };
  },
};

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener(createMessageRouter(handlers));
});
