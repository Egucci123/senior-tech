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
  console.error("ERROR: ANTHROPIC_API_KEY not set in .env file");
  process.exit(1);
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
  const { prompt, model, max_tokens = 400, file_urls = [], response_json_schema } = req.body;

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

    const systemPrompt = response_json_schema
      ? "You must respond with valid JSON only. No markdown code blocks, no explanation. Return only the raw JSON object."
      : undefined;

    const message = await anthropic.messages.create({
      model: resolveModel(model),
      max_tokens: Math.min(max_tokens, 4096),
      ...(systemPrompt ? { system: systemPrompt } : {}),
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
