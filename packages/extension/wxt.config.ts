import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'TSKey Password Manager',
    description: 'Vaultless password manager using deterministic key derivation',
    permissions: ['storage', 'activeTab', 'tabs', 'clipboardWrite', 'alarms'],
    host_permissions: ['<all_urls>'],
  },
});
