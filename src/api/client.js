// Direct API client — calls the local Express server

export const llm = async ({ prompt, system, model = 'claude_sonnet_4_6', max_tokens = 400, images = [], json = false }) => {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      system: system || null,
      model,
      max_tokens,
      file_urls: images,
      response_json_schema: json || null,
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.content;
};

export const findManual = async (brand, model = '') => {
  try {
    const res = await fetch(`/api/find-manual?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.manuals || [];
  } catch { return []; }
};

export const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => resolve(e.target.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
