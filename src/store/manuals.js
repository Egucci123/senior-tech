const KEY = 'saved_manuals';
const MAX = 5;

export const ManualsStore = {
  getAll: () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } },
  save: (entry) => {
    const all = ManualsStore.getAll();
    const recent = all[0];
    if (recent?.unit?.brand === entry.unit?.brand && recent?.unit?.model === entry.unit?.model &&
        Date.now() - new Date(recent.created_date).getTime() < 60000) return;
    all.unshift(entry);
    if (all.length > MAX) all.splice(MAX);
    localStorage.setItem(KEY, JSON.stringify(all));
  },
};
