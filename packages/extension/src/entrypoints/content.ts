import { fill, findPasswordFields } from '../domain/autofill';
import {
  getCurrentField,
  hideDropdown,
  isDropdownVisible,
  showDropdown,
  updateDropdown,
} from '../domain/autofill/ui';
import { generate, getStatus } from '../domain/messaging';
import type { FillMessage, Response } from '../domain/messaging';
import { extractRealm } from '@tskey/core';

type DropdownState = {
  isUnlocked: boolean;
  isLoading: boolean;
  realm: string;
};

let currentState: DropdownState = {
  isUnlocked: false,
  isLoading: false,
  realm: '',
};

function getCallbacks() {
  return {
    onGenerate: handleGenerate,
    onOpenPopup: handleOpenPopup,
    onClose: hideDropdown,
  };
}

async function handleGenerate(): Promise<void> {
  const field = getCurrentField();
  if (!field || !currentState.realm) return;

  currentState = { ...currentState, isLoading: true };
  updateDropdown(currentState, getCallbacks());

  const result = await generate(currentState.realm);

  if (result.success) {
    fill(field, result.data.password);
    hideDropdown();
  } else {
    currentState = { ...currentState, isLoading: false };
    updateDropdown(currentState, getCallbacks());
  }
}

function handleOpenPopup(): void {
  chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
}

async function handleFieldFocus(field: HTMLInputElement): Promise<void> {
  const realm = extractRealm(window.location.href);
  const statusResult = await getStatus();
  const isUnlocked = statusResult.success && statusResult.data.isUnlocked;

  currentState = {
    isUnlocked,
    isLoading: false,
    realm,
  };

  showDropdown(field, currentState, getCallbacks());
}

function handleDocumentClick(e: MouseEvent): void {
  if (!isDropdownVisible()) return;

  const target = e.target as Node;
  const field = getCurrentField();
  const dropdownContainer = document.getElementById('tskey-dropdown-container');

  if (field?.contains(target)) return;
  if (dropdownContainer?.contains(target)) return;

  hideDropdown();
}

function handleDocumentKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isDropdownVisible()) {
    hideDropdown();
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    const passwordFields = findPasswordFields();

    passwordFields.forEach((field) => {
      field.addEventListener('focus', () => handleFieldFocus(field));
    });

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);

    const observer = new MutationObserver(() => {
      const newFields = findPasswordFields();
      newFields.forEach((field) => {
        if (!field.dataset.tskeyBound) {
          field.dataset.tskeyBound = 'true';
          field.addEventListener('focus', () => handleFieldFocus(field));
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    chrome.runtime.onMessage.addListener(
      (message: FillMessage, _sender, sendResponse: (r: Response<void>) => void) => {
        if (message.type !== 'FILL') return;

        const field = getCurrentField() ?? findPasswordFields().find(isVisible) ?? null;
        if (!field) {
          sendResponse({ success: false, error: 'No password field found' });
          return;
        }

        fill(field, message.payload.password);
        hideDropdown();
        sendResponse({ success: true, data: undefined });
      },
    );
  },
});

function isVisible(element: HTMLInputElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
