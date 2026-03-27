import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, Wrench } from "lucide-react";
import QuickChips from "../components/diagnose/QuickChips";
import ChatBubble from "../components/diagnose/ChatBubble";
import ChatInput from "../components/diagnose/ChatInput";
import { AppState } from "../components/appState";
import { TicketStore } from "../components/ticketStore";
import { ManualsStore } from "../components/manualsStore";

const SYSTEM_PROMPT = `You are Senior Tech — a master HVAC technician with 20 years of field experience across residential and light commercial work. You have diagnosed thousands of systems and mentored dozens of younger techs.

Your personality:
- Direct, confident, no fluff
- You think out loud like a real tech — "first thing I'd check is..."
- You never overwhelm with a wall of text. One or two steps at a time, then wait for what they find
- You ask for a photo of the data plate when you need equipment info — never ask them to type model/serial manually
- When you see a photo of gauges, a data plate, a wiring diagram, or anything else — extract every useful piece of information from it automatically and continue the diagnosis without asking the tech to manually enter what's already visible in the image
- You adjust your explanation depth based on their experience level:
  - 0-3 years: explain the why behind each step
  - 4-10 years: skip basics, focus on what to check and what it means
  - 11+ years: peer level — just the key differentiators, no hand-holding
- You remember what they told you earlier in the conversation and never ask for the same info twice
- You know refrigerant types, PT relationships, superheat/subcool targets, electrical theory, airflow, controls, and equipment-specific quirks across all major brands
- For electrical faults you isolate methodically — always thinking about what divides the circuit in half fastest
- You always flag safety before any live voltage step. Non-negotiable.
- When a tech describes a symptom, your first instinct is to think about the last 10 times you saw that same symptom and what it turned out to be

You do not give legal or refrigerant purchase advice.
You do not guess — if you need more info you ask for it.
You never suggest replacing a part without a confirming measurement first.

GAUGE PHOTO READING — INSTRUCTIONS:
When a tech sends a photo of their gauges you must:
1. IDENTIFY the gauge brand/model immediately:
   - Fieldpiece: look for the SMAN series layout — large digital display, suction and discharge on split screen, superheat and subcool calculated and displayed automatically, refrigerant type shown on screen
   - Testo 550/557: landscape digital display, suction left/discharge right, SH and SC on lower portion of screen, refrigerant shown top of display
   - Yellow Jacket Titan: vertical or horizontal digital display, color coded blue/red for suction/discharge, SH and SC displayed, refrigerant type on screen
2. EXTRACT every visible value:
   - Suction pressure (psig)
   - Discharge pressure (psig)
   - Suction saturation temperature (°F)
   - Discharge saturation temperature (°F)
   - Superheat (°F)
   - Subcooling (°F)
   - Refrigerant type
   - Ambient temperature (°F) if shown
   - Line temperatures if shown
   - Any error codes or alerts shown on the display
3. IF the photo is blurry, too dark, at a bad angle, or any value is not clearly readable — do not guess. Immediately say: "I can't read [specific value] clearly — can you send another photo?" Never proceed with an assumed or estimated reading.
4. ALWAYS confirm readings back to the tech before diagnosing. Format exactly like this:
   "Here's what I'm reading:
   Refrigerant: [type]
   Suction: [x] psig / [x]°F sat
   Discharge: [x] psig / [x]°F sat
   Superheat: [x]°F
   Subcooling: [x]°F
   [any other values visible]

   Does that look right? I'll dig in once you confirm."
5. ONLY after the tech confirms — begin the diagnostic flow.

DIAGNOSTIC FLOW AFTER CONFIRMED READINGS:
Once readings are confirmed, analyze all values together — never in isolation. Work through this logic in order:

Step 1 — Refrigerant charge assessment:
- Evaluate superheat and subcooling together against system type
- Fixed orifice system: target SH 8-12°F, SC will vary
- TXV system: target SC 10-15°F, SH 8-12°F at coil
- Low suction + low SC + high SH = undercharged or restriction
- High suction + high SC + low SH = overcharged
- Normal pressures but high SH = metering device issue
- Low suction + high SH + normal SC = low airflow or dirty filter/coil

Step 2 — Compression ratio check:
- Divide discharge pressure by suction pressure
- Normal range: 2.5 to 4.0 for most systems
- Over 4.0 = high head pressure issue — check condenser airflow, dirty coil, overcharge, non-condensables
- Under 2.5 = low compression — check compressor efficiency

Step 3 — Cross reference with symptoms:
- Always tie readings back to what the tech described
- If readings conflict with symptoms, ask one clarifying question before proceeding — never ignore the conflict

Step 4 — Diagnosis and next steps:
- State the most likely cause first, confidently
- Give one clear next step — not a list of five things
- If a second cause is possible, mention it after the first is ruled out
- Never suggest replacement without a confirming test first

CRITICAL RULES FOR GAUGE READING:
- Never assume refrigerant type — it must be visible in the photo or confirmed by the tech
- Never interpolate a blurry number — always ask for a retake
- If SH and SC are not shown on the gauge display, calculate them from the pressure and temperature readings using the correct PT relationship for the confirmed refrigerant type
- Always flag if readings suggest unsafe operating conditions (extremely high discharge pressure, dangerously low suction, etc.) before continuing the diagnosis`;

const WELCOME_MSG = {
  role: "assistant",
  content: "**Senior Tech here.** Ready to diagnose.\n\nBefore we start — how many years have you been in the trade? This helps me calibrate my answers to your experience level.\n\nOr tap a common call type above to jump right in."
};

export default function DiagnosePage() {
  const [messages, setMessages] = useState(() => AppState.get('diag_messages') || [WELCOME_MSG]);
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted]     = useState(() => AppState.get('diag_started') || false);
  const chatEndRef = useRef(null);

  useEffect(() => { AppState.set('diag_messages', messages); }, [messages]);
  useEffect(() => { AppState.set('diag_started',  started);  }, [started]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildPrompt = (newMsg) => {
    const last5 = messages.slice(-5);
    const history = [...last5, { role: "user", content: newMsg }]
      .map(m => `${m.role === "user" ? "Tech" : "Senior Tech"}: ${m.content}`)
      .join("\n\n");
    return `${SYSTEM_PROMPT}\n\n--- CONVERSATION ---\n${history}\n\nSenior Tech:`;
  };

  // Background: detect data plate in AI response and auto-fetch manuals
  const tryAutoFetchManuals = async (aiResponse) => {
    try {
      const extraction = await base44.integrations.Core.InvokeLLM({
        prompt: `The following is a response from an HVAC diagnostic assistant after viewing an image. Did the assistant extract equipment nameplate or data plate information (brand, model, unit type, refrigerant)? If yes, return the extracted fields. If no nameplate/data plate was discussed, return {"found": false}.\n\nResponse:\n${aiResponse.slice(0, 1000)}`,
        model: "claude_sonnet_4_6",
        max_tokens: 200,
        response_json_schema: {
          type: "object",
          properties: {
            found:           { type: "boolean" },
            brand:           { type: "string" },
            model:           { type: "string" },
            unit_type:       { type: "string" },
            refrigerant_type:{ type: "string" },
          }
        }
      });

      if (!extraction.found || !extraction.brand) return;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Find HVAC technical manuals for this unit — Brand: ${extraction.brand}, Model: ${extraction.model || "unknown"}, Type: ${extraction.unit_type || "unknown"}, Refrigerant: ${extraction.refrigerant_type || "unknown"}. Provide the most likely direct URLs (PDFs preferred) for: installation manual, service/maintenance manual, wiring diagram, parts list. Use manufacturer websites and manualslib.com. Return structured JSON.`,
        model: "claude_sonnet_4_6",
        max_tokens: 600,
        response_json_schema: {
          type: "object",
          properties: {
            unit_summary: { type: "string" },
            documents: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type:   { type: "string" },
                  title:  { type: "string" },
                  url:    { type: "string" },
                  source: { type: "string" },
                }
              }
            }
          }
        }
      });

      if (res.documents?.length > 0) {
        ManualsStore.save({
          id: Date.now().toString(),
          created_date: new Date().toISOString(),
          unit: extraction,
          documents: res.documents,
          unit_summary: res.unit_summary || "",
        });
      }
    } catch {
      // Silent fail — never disrupt the main chat
    }
  };

  const sendMessage = async (text, imageUrls = []) => {
    setStarted(true);
    const userMsg = { role: "user", content: text, images: imageUrls };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    const prompt = buildPrompt(text);
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: "claude_sonnet_4_6",
      max_tokens: 400,
      ...(imageUrls.length > 0 ? { file_urls: imageUrls } : {}),
    });
    window.__trackCredit?.();
    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setIsLoading(false);
    // If image was sent, check in background if unit data was extracted
    if (imageUrls.length > 0) {
      tryAutoFetchManuals(response);
    }
  };

  const handleChipSelect = async (chip) => {
    setStarted(true);
    const userMsg = { role: "user", content: `Customer complaint: ${chip}. Residential system.` };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    const last5 = messages.slice(-5);
    const history = [...last5, userMsg]
      .map(m => `${m.role === "user" ? "Tech" : "Senior Tech"}: ${m.content}`)
      .join("\n\n");
    const prompt = `${SYSTEM_PROMPT}\n\n--- CONVERSATION ---\n${history}\n\nSenior Tech:`;
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: "claude_sonnet_4_6",
      max_tokens: 150,
    });
    window.__trackCredit?.();
    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setIsLoading(false);
  };

  const handleNewChat = async () => {
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length > 0) {
      const safetyFlagged = messages.some(m =>
        m.role === "assistant" && /safety hazard/i.test(m.content)
      );
      const ticketId = Date.now().toString();
      TicketStore.save({
        id: ticketId,
        created_date: new Date().toISOString(),
        messages,
        status: "in_progress",
        notes: "",
        safety_hazard: safetyFlagged,
        summary: null,
      });
      // Background: extract unit + fault summary from conversation
      try {
        const transcript = messages.slice(0, 12)
          .map(m => `${m.role === "user" ? "Tech" : "Senior Tech"}: ${m.content}`)
          .join("\n\n");
        const s = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract structured info from this HVAC diagnostic conversation. Return JSON only. If a field isn't mentioned, return null for it.\n\n${transcript}`,
          model: "claude_sonnet_4_6",
          max_tokens: 150,
          response_json_schema: {
            type: "object",
            properties: {
              brand:      { type: "string" },
              model:      { type: "string" },
              serial:     { type: "string" },
              fault_code: { type: "string" },
            }
          }
        });
        if (s && (s.brand || s.fault_code)) {
          TicketStore.update(ticketId, { summary: s });
        }
      } catch { /* silent */ }
    }
    setMessages([WELCOME_MSG]);
    setStarted(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 124px)" }}>

      {/* Toolbar: quick chips + new job button */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: "1px solid var(--border)", flexShrink: 0,
        paddingRight: 12,
      }}>
        <QuickChips onSelect={handleChipSelect} />
        {started && (
          <button onClick={handleNewChat} className="btn-press" style={{
            flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
            padding: "7px 13px", borderRadius: 6,
            border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-secondary)",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer",
          }}>
            <Plus size={13} /> NEW JOB
          </button>
        )}
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* Hero section */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "28px 16px 20px", textAlign: "center", flexShrink: 0,
        }}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div className="hexagon" style={{
              width: 80, height: 80,
              background: "rgba(79,195,247,0.12)",
              border: "1px solid rgba(79,195,247,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div className="hexagon" style={{
                width: 64, height: 64,
                background: "rgba(79,195,247,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Wrench size={28} color="var(--blue)" strokeWidth={2} />
              </div>
            </div>
            <div style={{
              position: "absolute", bottom: -2, right: -2,
              width: 18, height: 18, borderRadius: "50%",
              background: "var(--green)",
              border: "3px solid var(--bg)",
              boxShadow: "0 0 8px rgba(76,175,80,0.7)",
            }} />
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 28, fontWeight: 900, color: "var(--text-primary)",
            textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1,
          }}>
            SENIOR TECH
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, fontWeight: 600, color: "var(--blue)",
            textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 4,
          }}>
            20 YEARS FIELD EXPERIENCE
          </div>
        </div>

        {/* SESSION STARTED divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, padding: "0 16px 14px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 600, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap",
          }}>SESSION STARTED</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* Messages */}
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div className="hexagon" style={{
                flexShrink: 0, width: 32, height: 32,
                background: "var(--blue)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Loader2 size={15} color="#0f0f0f" style={{ animation: "spin 1s linear infinite" }} />
              </div>
              <div style={{
                padding: "12px 16px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "2px solid var(--blue)",
                borderRadius: "3px 12px 12px 12px",
                display: "flex", gap: 5, alignItems: "center",
              }}>
                {[0, 150, 300].map(delay => (
                  <div key={delay} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "var(--blue)",
                    animation: `dotBounce 1.2s ease-in-out ${delay}ms infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}