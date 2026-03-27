// Simple in-memory global state — persists across tab switches for the entire session.
// Cleared only when the app is fully reloaded (by design).

const _store = {};

export const AppState = {
  get: (key) => _store[key] ?? null,
  set: (key, value) => { _store[key] = value; },
  clear: (key) => { delete _store[key]; },
};