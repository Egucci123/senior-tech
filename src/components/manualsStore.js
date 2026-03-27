// Stores the last 10 sets of manuals fetched after data plate reads.
// Auto-purges oldest when the 10-entry limit is exceeded.

const KEY = 'saved_manuals';
const MAX = 10;

export const ManualsStore = {
  getAll: () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  },

  save: (entry) => {
    const all = ManualsStore.getAll();
    // Avoid duplicate saves for the same unit within 60 seconds
    const recent = all[0];
    if (recent && recent.unit?.brand === entry.unit?.brand &&
        recent.unit?.model === entry.unit?.model &&
        Date.now() - new Date(recent.created_date).getTime() < 60000) return;
    all.unshift(entry);
    if (all.length > MAX) all.splice(MAX);
    localStorage.setItem(KEY, JSON.stringify(all));
  },

  getAll: () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  },
};
