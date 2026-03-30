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

// Clean brand name — strip subsidiary/dual names ("York/Johnson Controls" → "York")
function cleanBrand(brand) {
  return brand.split(/[\/,]/)[0].trim();
}

// Generate model search tokens at decreasing specificity
// ZE060H12A2A1ABA1A2 → ["ZE060H12", "ZE060H", "ZE060"]
function modelTokens(model) {
  if (!model) return [];
  const clean = model.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const tokens = [];
  if (clean.length >= 8) tokens.push(clean.slice(0, 8));
  if (clean.length >= 6) tokens.push(clean.slice(0, 6));
  if (clean.length >= 4) tokens.push(clean.slice(0, 4));
  return [...new Set(tokens)]; // dedupe
}

// Score a search result — higher = better match
function scoreResult(r, modelTokens, brand) {
  const url   = (r.url   || '').toLowerCase();
  const title = (r.title || '').toLowerCase();
  const bl    = brand.toLowerCase();
  let score = 0;
  if (url.includes('manualslib.com'))     score += 10;
  if (url.includes('.pdf'))               score += 8;
  if (title.includes(bl))                 score += 3;
  if (url.includes(bl))                   score += 3;
  for (const tok of modelTokens) {
    const t = tok.toLowerCase();
    if (url.includes(t))   score += 6;
    if (title.includes(t)) score += 4;
  }
  return score;
}

async function braveSearch(query, apiKey) {
  const resp = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(6000),
    }
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.web?.results || [];
}

// Manual finder — uses Brave Search to find real PDF manuals for a specific unit
app.get("/api/find-manual", async (req, res) => {
  const { brand, model } = req.query;
  if (!brand) return res.json({ manuals: [] });
  if (!process.env.BRAVE_API_KEY) {
    console.warn('BRAVE_API_KEY not set');
    return res.json({ manuals: [] });
  }

  const b = cleanBrand(brand);
  const tokens = modelTokens(model);

  // Build query list per manual type — most specific first, fall back to brand-only
  const queryLists = {
    'Installation Manual': [
      ...tokens.map(t => `${b} ${t} installation manual site:manualslib.com`),
      `${b} installation manual site:manualslib.com`,
      ...tokens.map(t => `${b} ${t} installation manual filetype:pdf`),
    ],
    'Service Manual': [
      ...tokens.map(t => `${b} ${t} service manual site:manualslib.com`),
      `${b} service manual site:manualslib.com`,
      ...tokens.map(t => `${b} ${t} service manual filetype:pdf`),
    ],
    'Wiring Diagram': [
      ...tokens.map(t => `${b} ${t} wiring diagram site:manualslib.com`),
      `${b} wiring diagram site:manualslib.com`,
      ...tokens.map(t => `${b} ${t} wiring diagram filetype:pdf`),
    ],
  };

  const manuals = [];
  for (const [type, queries] of Object.entries(queryLists)) {
    let bestResult = null;
    let bestScore  = -1;

    for (const query of queries) {
      try {
        const results = await braveSearch(query, process.env.BRAVE_API_KEY);
        for (const r of results) {
          const s = scoreResult(r, tokens, b);
          if (s > bestScore) { bestScore = s; bestResult = r; }
        }
        // Stop early if we already found a model-specific manualslib page (score ≥ 16)
        if (bestScore >= 16) break;
      } catch (err) {
        console.warn(`Search failed [${type}]:`, err.message);
      }
    }

    if (bestResult?.url) {
      manuals.push({
        type,
        title: bestResult.title || type,
        url: bestResult.url,
        isPdf: bestResult.url.toLowerCase().includes('.pdf'),
      });
    }
  }

  res.json({ manuals });
});

// PDF proxy — fetches and streams PDFs through the server so they open directly in-app
app.get("/api/proxy-pdf", async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('http')) return res.status(400).send('Invalid URL');

  try {
    const pdfResp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'application/pdf,*/*',
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!pdfResp.ok) return res.status(404).send('Manual not found');

    const contentType = pdfResp.headers.get('content-type') || '';
    if (!contentType.includes('pdf') && !url.toLowerCase().includes('.pdf')) {
      return res.status(400).send('Not a PDF');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await pdfResp.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('PDF proxy error:', err.message);
    res.status(500).send('Could not load PDF');
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
