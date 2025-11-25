import type { Message, Response } from './types';

export type MessageHandler = (
  message: Message,
  sender: chrome.runtime.MessageSender,
) => Promise<Response<unknown>>;

export function createMessageRouter(
  handlers: Record<Message['type'], MessageHandler>,
): (
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: Response<unknown>) => void,
) => boolean {
  return (message, sender, sendResponse) => {
    const handler = handlers[message.type];
    if (!handler) {
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
      return false;
    }

    handler(message, sender)
      .then(sendResponse)
      .catch((err: Error) => {
        sendResponse({ success: false, error: err.message });
      });

    return true;
  };
}
