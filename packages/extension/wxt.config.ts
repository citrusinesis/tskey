import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Gokey Password Manager',
    description: 'Vaultless password manager based on Cloudflare gokey',
    permissions: ['storage', 'activeTab', 'clipboardWrite', 'alarms'],
    host_permissions: ['<all_urls>'],
  },
});
