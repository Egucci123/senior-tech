const KEY = 'diag_tickets';
const MAX = 5;

export const TicketStore = {
  getAll: () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } },
  save: (ticket) => {
    const all = TicketStore.getAll();
    all.unshift(ticket);
    if (all.length > MAX) all.splice(MAX);
    localStorage.setItem(KEY, JSON.stringify(all));
  },
  update: (id, changes) => {
    const all = TicketStore.getAll();
    const i = all.findIndex(t => t.id === id);
    if (i >= 0) { all[i] = { ...all[i], ...changes }; localStorage.setItem(KEY, JSON.stringify(all)); }
  },
};
