import { decryptSeed, encryptSeed, generateSeed } from '@tskey/core';

import { generate, getRealm } from '../generator';
import { createMessageRouter, type Message, type MessageHandler } from '../messaging';
import { getDecryptedSeed, getMasterPassword, hasSeed, isUnlocked, lock, unlock } from '../session';
import { getEncryptedSeed, hasEncryptedSeed, setEncryptedSeed } from '../storage';

const handlers: Record<Message['type'], MessageHandler> = {
  UNLOCK: async (message) => {
    if (message.type !== 'UNLOCK') {
      return { success: false, error: 'Invalid message' };
    }

    const encryptedSeed = await getEncryptedSeed();
    if (encryptedSeed) {
      try {
        const seed = await decryptSeed(encryptedSeed, message.payload.password);
        unlock(message.payload.password, seed);
      } catch {
        return { success: false, error: 'Invalid password' };
      }
    } else {
      unlock(message.payload.password);
    }

    return { success: true, data: undefined };
  },

  LOCK: async () => {
    lock();
    return { success: true, data: undefined };
  },

  GET_STATUS: async () => {
    const seedExists = await hasEncryptedSeed();
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

    const seed = await generateSeed();
    const encrypted = await encryptSeed(seed, message.payload.password);
    await setEncryptedSeed(encrypted);
    unlock(message.payload.password, seed);

    return { success: true, data: undefined };
  },

  HAS_SEED: async () => {
    const exists = await hasEncryptedSeed();
    return { success: true, data: { hasSeed: exists } };
  },

  FILL: async () => {
    return { success: false, error: 'FILL should be sent to content script' };
  },
};

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener(createMessageRouter(handlers));
});
