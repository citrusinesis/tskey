export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    console.log('Gokey content script loaded');

    // TODO: Implement form detection and autofill
  },
});
