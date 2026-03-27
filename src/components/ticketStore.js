// Stores last 10 diagnostic tickets in localStorage.
// Oldest is auto-deleted when the 10-ticket limit is exceeded.

const KEY = 'diag_tickets';
const MAX = 10;

export const TicketStore = {
  getAll: () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch { return []; }
  },

  save: (ticket) => {
    const tickets = TicketStore.getAll();
    tickets.unshift(ticket);
    if (tickets.length > MAX) tickets.splice(MAX);
    localStorage.setItem(KEY, JSON.stringify(tickets));
  },

  update: (id, changes) => {
    const tickets = TicketStore.getAll();
    const idx = tickets.findIndex(t => t.id === id);
    if (idx !== -1) {
      tickets[idx] = { ...tickets[idx], ...changes };
      localStorage.setItem(KEY, JSON.stringify(tickets));
    }
    return tickets[idx >= 0 ? idx : 0];
  },
};
