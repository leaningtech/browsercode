// Whether the Home page's "What is BrowserCode?" panel is open. Module-level $state singleton
// (same pattern as zen.svelte.ts) so the root layout can dim the chrome around the hero (sidebar
// gaps, page background) in sync with the panel, without prop-threading state down from +page.svelte.
export const aboutPanelState = $state({ open: false });
