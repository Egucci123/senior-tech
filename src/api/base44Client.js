// Senior Tech - Local API Shim
// Replaces @base44/sdk for standalone local use

// ── Entity CRUD using localStorage ─────────────────────────────
const createEntityStore = (name) => {
  const KEY = `seniortech_${name.toLowerCase()}`;

  const getAll = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  };

  const save = (items) => {
    localStorage.setItem(KEY, JSON.stringify(items));
  };

  return {
    list: async (sortField = "-created_date", limit = 100) => {
      let items = getAll();
      const field = sortField.startsWith("-") ? sortField.slice(1) : sortField;
      const desc = sortField.startsWith("-");
      items.sort((a, b) => {
        const av = a[field] || "";
        const bv = b[field] || "";
        return desc ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
      });
      return items.slice(0, limit);
    },

    filter: async (criteria, sortField = "-created_date", limit = 100) => {
      let items = getAll().filter(item =>
        Object.entries(criteria).every(([k, v]) => item[k] === v)
      );
      const field = sortField.startsWith("-") ? sortField.slice(1) : sortField;
      const desc = sortField.startsWith("-");
      items.sort((a, b) => {
        const av = a[field] || "";
        const bv = b[field] || "";
        return desc ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
      });
      return items.slice(0, limit);
    },

    create: async (data) => {
      const items = getAll();
      const newItem = {
        ...data,
        id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        created_date: new Date().toISOString(),
        created_by: "tech@seniortech.local",
      };
      items.push(newItem);
      save(items);
      return newItem;
    },

    update: async (id, updates) => {
      const items = getAll();
      const idx = items.findIndex(i => i.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...updates, updated_date: new Date().toISOString() };
        save(items);
        return items[idx];
      }
      return null;
    },

    delete: async (id) => {
      save(getAll().filter(i => i.id !== id));
    },
  };
};

// ── LLM via local proxy ─────────────────────────────────────────
const InvokeLLM = async ({
  prompt,
  model = "claude_sonnet_4_6",
  max_tokens = 400,
  file_urls = [],
  response_json_schema = null,
  system = null,
}) => {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model, max_tokens, file_urls, response_json_schema, system }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.content;
};

// ── File upload — convert to base64 data URL ────────────────────
const UploadFile = ({ file }) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ file_url: e.target.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ── Auth (local no-op) ──────────────────────────────────────────
const auth = {
  me: async () => ({
    email: "tech@seniortech.local",
    full_name: "Local Tech",
    role: "admin",
  }),
  redirectToLogin: () => {},
  logout: () => {},
};

// ── Public export ───────────────────────────────────────────────
export const base44 = {
  auth,
  entities: {
    Job: createEntityStore("Job"),
  },
  integrations: {
    Core: { InvokeLLM, UploadFile },
  },
};
