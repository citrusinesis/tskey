const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
];

export function findPasswordFields(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>(PASSWORD_SELECTORS.join(','))];
}

export function findActivePasswordField(): HTMLInputElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && isPasswordField(active)) {
    return active;
  }
  return findPasswordFields().find(isVisible) ?? null;
}

function isPasswordField(element: HTMLInputElement): boolean {
  if (element.type === 'password') return true;
  const autocomplete = element.autocomplete;
  return autocomplete === 'current-password' || autocomplete === 'new-password';
}

function isVisible(element: HTMLInputElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
