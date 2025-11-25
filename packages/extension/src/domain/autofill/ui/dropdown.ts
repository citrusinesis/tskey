import dropdownStyles from './dropdown.css?inline';

type DropdownState = {
  isUnlocked: boolean;
  isLoading: boolean;
  realm: string;
};

type DropdownCallbacks = {
  onGenerate: () => void;
  onOpenPopup: () => void;
  onClose: () => void;
};

let dropdownContainer: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let currentField: HTMLInputElement | null = null;

export function showDropdown(
  field: HTMLInputElement,
  state: DropdownState,
  callbacks: DropdownCallbacks,
): void {
  hideDropdown();

  currentField = field;
  dropdownContainer = document.createElement('div');
  dropdownContainer.id = 'tskey-dropdown-container';
  shadowRoot = dropdownContainer.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = dropdownStyles;
  shadowRoot.appendChild(style);

  const dropdown = document.createElement('div');
  dropdown.className = 'tskey-dropdown';
  dropdown.innerHTML = renderContent(state);
  shadowRoot.appendChild(dropdown);

  document.body.appendChild(dropdownContainer);
  positionDropdown(field, dropdown);

  attachEventListeners(dropdown, callbacks);
}

export function hideDropdown(): void {
  if (dropdownContainer) {
    dropdownContainer.remove();
    dropdownContainer = null;
    shadowRoot = null;
    currentField = null;
  }
}

export function updateDropdown(state: DropdownState, callbacks: DropdownCallbacks): void {
  if (!shadowRoot) return;

  const dropdown = shadowRoot.querySelector('.tskey-dropdown');
  if (dropdown) {
    dropdown.innerHTML = renderContent(state);
    attachEventListeners(dropdown as HTMLElement, callbacks);
  }
}

export function isDropdownVisible(): boolean {
  return dropdownContainer !== null;
}

export function getCurrentField(): HTMLInputElement | null {
  return currentField;
}

function renderContent(state: DropdownState): string {
  if (state.isLoading) {
    return `
      <div class="tskey-header">
        <span class="tskey-title">TSKey</span>
      </div>
      <div class="tskey-loading">Loading...</div>
    `;
  }

  if (!state.isUnlocked) {
    return `
      <div class="tskey-header">
        <span class="tskey-title">TSKey</span>
      </div>
      <div class="tskey-unlock">
        <div class="tskey-unlock-text">Unlock to generate password</div>
        <button class="tskey-unlock-btn" data-action="open-popup">Unlock</button>
      </div>
    `;
  }

  return `
    <div class="tskey-header">
      <div>
        <span class="tskey-title">TSKey</span>
        <div class="tskey-realm">${escapeHtml(state.realm)}</div>
      </div>
      <button class="tskey-close" data-action="close">✕</button>
    </div>
    <div class="tskey-actions">
      <button class="tskey-btn tskey-btn-primary" data-action="generate">
        Generate & Fill
      </button>
      <button class="tskey-btn tskey-btn-secondary" data-action="open-popup">
        Settings
      </button>
    </div>
  `;
}

function positionDropdown(field: HTMLInputElement, dropdown: HTMLElement): void {
  const rect = field.getBoundingClientRect();

  dropdown.style.position = 'fixed';
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.minWidth = `${Math.max(rect.width, 280)}px`;
}

function attachEventListeners(dropdown: HTMLElement, callbacks: DropdownCallbacks): void {
  dropdown.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;

    switch (action) {
      case 'generate':
        callbacks.onGenerate();
        break;
      case 'open-popup':
        callbacks.onOpenPopup();
        break;
      case 'close':
        callbacks.onClose();
        break;
    }
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
