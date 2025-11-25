import { generate, getRealm } from '../generator';
import { createMessageRouter, type Message, type MessageHandler } from '../messaging';
import { getMasterPassword, isUnlocked, lock, unlock } from '../session';

const handlers: Record<Message['type'], MessageHandler> = {
  UNLOCK: async (message) => {
    if (message.type !== 'UNLOCK') {
      return { success: false, error: 'Invalid message' };
    }
    unlock(message.payload.password);
    return { success: true, data: undefined };
  },

  LOCK: async () => {
    lock();
    return { success: true, data: undefined };
  },

  GET_STATUS: async () => {
    return { success: true, data: { isUnlocked: isUnlocked() } };
  },

  GENERATE: async (message) => {
    if (message.type !== 'GENERATE') {
      return { success: false, error: 'Invalid message' };
    }

    const masterPassword = getMasterPassword();
    if (!masterPassword) {
      return { success: false, error: 'Session locked' };
    }

    const password = await generate(masterPassword, message.payload.realm);
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

  FILL: async () => {
    return { success: false, error: 'FILL should be sent to content script' };
  },
};

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener(createMessageRouter(handlers));
});
