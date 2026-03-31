/**
 * Senior Tech Prompt Eval Suite
 * Usage: npm run eval
 *
 * Runs every scenario in scenarios.json through the live system prompt from
 * Diagnose.jsx, then uses Claude Haiku as a judge to score each response
 * against weighted criteria. Outputs a pass/fail report with detail on failures.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Load ANTHROPIC_API_KEY — read .env manually to avoid Windows path issues
try {
  const envPath = join(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...valParts] = line.split('=');
    if (key && valParts.length) {
      process.env[key.trim()] = valParts.join('=').trim();
    }
  }
} catch { /* .env not found — rely on environment */ }

// ─── Extract the live system prompt from Diagnose.jsx ────────────────────────
// This ensures the eval always tests what is actually running in the app.
function extractSystemPrompt() {
  const src = readFileSync(
    join(__dirname, '..', 'src', 'pages', 'Diagnose.jsx'),
    'utf-8'
  );
  // Match everything between the opening backtick and closing backtick+semicolon
  const start = src.indexOf('const SYSTEM_PROMPT = `');
  if (start === -1) throw new Error('Could not find SYSTEM_PROMPT in Diagnose.jsx');
  const contentStart = start + 'const SYSTEM_PROMPT = `'.length;
  const end = src.indexOf('`;', contentStart);
  if (end === -1) throw new Error('Could not find end of SYSTEM_PROMPT');
  return src.slice(contentStart, end);
}

// ─── Colors for terminal output ──────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  blue:   '\x1b[36m',
  dim:    '\x1b[2m',
};

function pass(s) { return `${C.green}${s}${C.reset}`; }
function fail(s) { return `${C.red}${s}${C.reset}`; }
function warn(s) { return `${C.yellow}${s}${C.reset}`; }
function dim(s)  { return `${C.dim}${s}${C.reset}`; }
function bold(s) { return `${C.bold}${s}${C.reset}`; }

// ─── Main ────────────────────────────────────────────────────────────────────
async function runEvals() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(fail('ERROR: ANTHROPIC_API_KEY not set in .env'));
    process.exit(1);
  }

  const client    = new Anthropic({ apiKey });
  const scenarios = JSON.parse(readFileSync(join(__dirname, 'scenarios.json'), 'utf-8'));

  let systemPrompt;
  try {
    systemPrompt = extractSystemPrompt();
    console.log(dim(`\n  System prompt loaded: ${systemPrompt.length.toLocaleString()} chars from Diagnose.jsx`));
  } catch (err) {
    console.error(fail(`ERROR extracting system prompt: ${err.message}`));
    process.exit(1);
  }

  console.log(`\n${bold('═══════════════════════════════════════════════════')}`);
  console.log(`${bold('  SENIOR TECH PROMPT EVAL SUITE')}`);
  console.log(`${bold('═══════════════════════════════════════════════════')}\n`);
  console.log(`  ${scenarios.length} scenarios  |  Sonnet → response  |  Haiku → judge\n`);

  const results = [];
  let idx = 0;

  for (const scenario of scenarios) {
    idx++;
    const label = `${String(idx).padStart(2, ' ')}/${scenarios.length}  ${scenario.name}`;
    process.stdout.write(`  ${dim(label)}… `);

    try {
      // ── Step 1: Get Senior Tech's response ──────────────────────────────
      const chatResponse = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 600,
        system:     systemPrompt,
        messages:   scenario.messages,
      });
      const seniorTechResponse = chatResponse.content[0]?.text ?? '';

      // ── Step 2: Judge with Haiku ─────────────────────────────────────────
      const maxScore = scenario.criteria.reduce((s, c) => s + c.weight, 0);

      const judgePrompt = `You are a strict evaluator of an AI HVAC diagnostic assistant called "Senior Tech".

CONVERSATION:
${scenario.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

SENIOR TECH'S RESPONSE TO EVALUATE:
"""
${seniorTechResponse}
"""

VERIFIED EXPERT ANSWER (written by a 20-year HVAC field technician — this is the ground truth):
"""
${scenario.correct_answer}
"""

CRITERIA derived from the expert answer — score each 1 (met) or 0 (not met). Be strict:
${scenario.criteria.map((c, i) => `${i + 1}. id="${c.id}" weight=${c.weight}: ${c.description}`).join('\n')}

Reply with ONLY a JSON object, no markdown fences, no explanation outside JSON:
{
  "scores": { ${scenario.criteria.map(c => `"${c.id}": 0`).join(', ')} },
  "notes": "one sentence explaining any failures, or 'all criteria met'"
}`;

      const judgeResponse = await client.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages:   [{ role: 'user', content: judgePrompt }],
      });

      let judgeResult = { scores: {}, notes: 'parse error' };
      try {
        const raw = judgeResponse.content[0]?.text?.trim() ?? '';
        // Strip any markdown fences if Haiku added them
        const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
        const parsed  = JSON.parse(jsonStr);
        if (parsed.scores) judgeResult = parsed;
      } catch { /* keep default */ }

      // ── Step 3: Calculate weighted score ────────────────────────────────
      let earned = 0;
      for (const c of scenario.criteria) {
        if (judgeResult.scores?.[c.id] === 1) earned += c.weight;
      }
      const pct    = Math.round((earned / maxScore) * 100);
      const passed = pct >= 80;

      results.push({ scenario, response: seniorTechResponse, judgeResult, earned, maxScore, pct, passed });

      const badge = passed ? pass(`✓ PASS ${pct}%`) : fail(`✗ FAIL ${pct}%`);
      console.log(badge);

    } catch (err) {
      results.push({ scenario, error: err.message, passed: false, pct: 0, earned: 0, maxScore: 0 });
      console.log(fail(`ERROR: ${err.message}`));
    }

    // Avoid rate-limit
    await new Promise(r => setTimeout(r, 700));
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const passCount  = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const avgPct     = Math.round(results.reduce((s, r) => s + r.pct, 0) / totalCount);

  console.log(`\n${bold('═══════════════════════════════════════════════════')}`);
  const summaryColor = avgPct >= 90 ? pass : avgPct >= 75 ? warn : fail;
  console.log(`  ${bold('RESULTS:')} ${passCount}/${totalCount} passed  |  Score: ${summaryColor(avgPct + '%')}`);
  console.log(`${bold('═══════════════════════════════════════════════════')}\n`);

  // ── Failure detail ─────────────────────────────────────────────────────────
  const failures = results.filter(r => !r.passed && !r.error);
  if (failures.length > 0) {
    console.log(`${bold(fail('FAILURES — action needed:'))}\n`);
    for (const f of failures) {
      console.log(`  ${fail('✗')} ${bold(f.scenario.name)} — ${f.pct}%`);
      console.log(`     ${dim(f.scenario.description)}\n`);

      for (const c of f.scenario.criteria) {
        const scored = f.judgeResult?.scores?.[c.id];
        const icon   = scored === 1 ? pass('✓') : fail('✗');
        const weight = scored === 1 ? dim(`[+${c.weight}]`) : fail(`[+${c.weight} missed]`);
        console.log(`     ${icon} ${weight} ${c.description}`);
      }

      console.log(`\n     ${dim('Judge note:')} ${f.judgeResult?.notes ?? 'none'}`);
      console.log(`\n     ${dim('Senior Tech said:')}`);
      const preview = (f.response ?? '').substring(0, 350).replace(/\n/g, '\n       ');
      console.log(`       "${preview}${f.response?.length > 350 ? '…' : ''}"`);
      console.log(`\n  ${'─'.repeat(51)}\n`);
    }
  }

  // ── Errors ─────────────────────────────────────────────────────────────────
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.log(`${warn('ERRORS (API/network):')} ${errors.map(e => e.scenario.name).join(', ')}\n`);
  }

  // ── Final verdict ──────────────────────────────────────────────────────────
  if (avgPct >= 90) {
    console.log(pass('  ★ PROMPT IS SOLID — ready for production\n'));
  } else if (avgPct >= 75) {
    console.log(warn('  △ PROMPT NEEDS WORK — address failures above before shipping\n'));
  } else {
    console.log(fail('  ✗ CRITICAL GAPS — prompt is unreliable, fix before launch\n'));
  }

  // Non-zero exit code if any failures (useful for CI)
  if (passCount < totalCount) process.exit(1);
}

runEvals().catch(err => {
  console.error(fail(`\nFatal error: ${err.message}\n`));
  process.exit(1);
});
