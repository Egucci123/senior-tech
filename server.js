import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "50mb" }));

// Serve built frontend in production
const distPath = join(__dirname, "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("WARNING: ANTHROPIC_API_KEY not set — AI features will not work");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Map base44 model names to real Claude models
function resolveModel(modelName) {
  if (!modelName) return "claude-sonnet-4-6";
  const m = modelName.toLowerCase();
  if (m.includes("haiku")) return "claude-haiku-4-5-20251001";
  if (m.includes("opus")) return "claude-opus-4-6";
  return "claude-sonnet-4-6"; // default for sonnet + gemini fallback
}

app.post("/api/llm", async (req, res) => {
  const { prompt, model, max_tokens = 400, file_urls = [], response_json_schema, system } = req.body;

  try {
    const content = [];

    // Add images (base64 data URLs)
    for (const url of file_urls) {
      if (url && url.startsWith("data:")) {
        const [header, data] = url.split(",");
        const mediaTypeMatch = header.match(/data:([^;]+)/);
        const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : "image/jpeg";
        const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        const safeType = validTypes.includes(mediaType) ? mediaType : "image/jpeg";
        content.push({
          type: "image",
          source: { type: "base64", media_type: safeType, data },
        });
      }
    }

    content.push({ type: "text", text: prompt });

    // Build system parameter:
    // - If JSON call: plain string instruction
    // - If system prompt provided: array with cache_control for 90% discount on repeated system prompts
    // - Otherwise: no system prompt
    let systemParam;
    if (response_json_schema) {
      systemParam = "You must respond with valid JSON only. No markdown code blocks, no explanation. Return only the raw JSON object.";
    } else if (system) {
      systemParam = [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];
    }

    const message = await anthropic.messages.create({
      model: resolveModel(model),
      max_tokens: Math.min(max_tokens, 4096),
      ...(systemParam ? { system: systemParam } : {}),
      messages: [{ role: "user", content }],
    });

    let text = message.content[0].text;

    if (response_json_schema) {
      // Strip markdown fences if present
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      try {
        return res.json({ content: JSON.parse(text) });
      } catch {
        return res.json({ content: text });
      }
    }

    res.json({ content: text });
  } catch (err) {
    console.error("LLM error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Manual finder — searches ManualsLib for the real product page for a specific unit
app.get("/api/find-manual", async (req, res) => {
  const { brand, model } = req.query;
  if (!brand) return res.json({ pages: [], fallback: null });

  const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const fallback = `https://www.manualslib.com/brand/${brandSlug}/`;

  try {
    const q = encodeURIComponent(`${brand} ${model || ''}`.trim());
    const searchUrl = `https://www.manualslib.com/search.php?q=${q}`;

    const resp = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!resp.ok) return res.json({ pages: [], fallback });

    const html = await resp.text();

    // Extract unique product page URLs from search results
    const matches = [...html.matchAll(/href="(\/products\/[^"]+\.html)"/g)];
    const pages = [...new Set(matches.map(m => `https://www.manualslib.com${m[1]}`))].slice(0, 4);

    res.json({ pages, fallback: pages.length === 0 ? fallback : null });
  } catch {
    res.json({ pages: [], fallback });
  }
});

// SPA fallback — serve index.html for all non-API routes
if (existsSync(distPath)) {
  app.get("*", (req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🔧 Senior Tech running on http://localhost:${PORT}`);
  console.log(`   Anthropic Claude connected\n`);
});
