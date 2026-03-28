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

// Manual finder — uses AI web search to find real manual pages for a specific unit
app.get("/api/find-manual", async (req, res) => {
  const { brand, model } = req.query;
  if (!brand) return res.json({ manuals: [] });

  const unitName = `${brand}${model ? ' ' + model : ''}`.trim();
  const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `Search manualslib.com for the ${unitName} HVAC unit manuals. Find direct page URLs for: installation manual, service manual, and wiring diagram. Return ONLY a JSON array, no other text:\n[{"type":"Installation Manual","title":"...","url":"https://www.manualslib.com/..."},{"type":"Service Manual","title":"...","url":"https://www.manualslib.com/..."},{"type":"Wiring Diagram","title":"...","url":"https://www.manualslib.com/..."}]\nOnly include real URLs from actual search results.`
      }]
    }, { headers: { 'anthropic-beta': 'web-search-2025-03-05' } });

    const textBlock = message.content.find(b => b.type === 'text');
    if (textBlock) {
      const cleaned = textBlock.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      try {
        const manuals = JSON.parse(cleaned);
        if (Array.isArray(manuals) && manuals.length > 0) {
          return res.json({ manuals });
        }
      } catch {}
      // Fall back to extracting any manualslib URLs from the text
      const urls = [...textBlock.text.matchAll(/https?:\/\/[^\s"'<>)]*manualslib[^\s"'<>)]*/gi)]
        .map(m => m[0]).filter((u, i, a) => a.indexOf(u) === i).slice(0, 4);
      if (urls.length > 0) {
        return res.json({ manuals: urls.map((url, i) => ({ type: `Manual ${i + 1}`, title: url, url })) });
      }
    }
    res.json({ manuals: [], fallback: `https://www.manualslib.com/brand/${brandSlug}/` });
  } catch (err) {
    console.error('find-manual error:', err.message);
    res.json({ manuals: [], fallback: `https://www.manualslib.com/brand/${brandSlug}/` });
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
