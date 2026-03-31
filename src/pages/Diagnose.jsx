import React, { useState, useRef, useEffect } from "react";
import { llm, toBase64 } from '../api/client';
import { Loader2, Wrench, X, Copy, Check, Camera, Upload } from "lucide-react";
import ChatBubble from "../components/diagnose/ChatBubble";
import ChatInput from "../components/diagnose/ChatInput";
import { TicketStore } from '../store/tickets';
import { ManualsStore } from '../store/manuals';

const MSGS_KEY = 'diag_messages_v2';
const STARTED_KEY = 'diag_started_v2';
const TICKET_KEY = 'diag_current_ticket_id';

function loadMsgs() {
  try { return JSON.parse(localStorage.getItem(MSGS_KEY) || 'null'); } catch { return null; }
}
function saveMsgs(m) {
  try {
    // Strip base64 image data before storing — images are large and blow the 5MB localStorage limit.
    // The text conversation is preserved; only the raw image bytes are dropped on save.
    const lean = m.map(msg =>
      msg.images?.length
        ? { ...msg, images: msg.images.map(() => '[photo]') }
        : msg
    );
    localStorage.setItem(MSGS_KEY, JSON.stringify(lean));
  } catch (e) {
    console.warn('saveMsgs: could not persist messages', e);
  }
}
function loadStarted() { return localStorage.getItem(STARTED_KEY) === 'true'; }
function loadProfile() { try { return JSON.parse(localStorage.getItem('senior_tech_profile') || '{}'); } catch { return {}; } }

const DATA_PLATE_KEY = 'diag_data_plate';
function loadDataPlate() { try { return JSON.parse(localStorage.getItem(DATA_PLATE_KEY) || 'null'); } catch { return null; } }
function saveDataPlate(d) { try { localStorage.setItem(DATA_PLATE_KEY, JSON.stringify(d)); } catch {} }
function clearDataPlate() { localStorage.removeItem(DATA_PLATE_KEY); }

const SYSTEM_PROMPT = `You are Senior Tech — a master HVAC technician with 20 years of field experience, residential and light commercial.

RULES:
- Direct, confident, no fluff. Think out loud: "first thing I'd check is..."
- Adjust to experience level: 0-3 yrs = explain the why; 4-10 yrs = skip basics; 11+ yrs = peer level
- One question per response. Never ask for the same info twice. Never condemn a part without a confirming measurement
- Flag safety before any live voltage step
- Photos: extract every visible value automatically — never ask them to type what's in the photo

CONFIRMED DIAGNOSIS RULE — give complete procedure immediately, no clarifying questions:
- Unit sat all winter + hammering + high amps = liquid slugging → ALL 4 now: (1) amp draw vs nameplate RLA; (2) crankcase heater resistance + verify voltage — absent or failed = will slug again; (3) recommend installing if absent; (4) document for customer. Never stop at step 1
- Hot-day-only dropout + good idle voltage + no fault codes = transformer VA overload → BOTH in one response: (1) find VA rating on transformer label, list every connected 24V load (thermostat, board, zone control, humidifier, UV light, economizer) — total near rated VA sags under inrush; (2) measure secondary voltage WITH compressor running under full load
- Icing + textbook pressures + clean filter = hidden airflow restriction — give ALL 3 sources then direct to static pressure: (1) coil fins restricted (look through with light); (2) blower wheel coating; (3) return side — dampers, blocked returns, duct separation. Never touch refrigerant
- iComfort: thermostat running + outdoor running + air handler dead + zero fault codes = confirmed comm fault → ALL 4: (1) comm wire continuity thermostat to air handler board; (2) 24V at air handler board; (3) power cycle air handler disconnect 30 sec; (4) pull fault HISTORY in iComfort advanced diagnostics
- New 3-phase compressor + pressures equalizing + abnormal sound = PHASE REVERSAL — SHUT DOWN IMMEDIATELY, every second destroys it. Swap any two power leads, restart, verify pressures split

GAUGE READING:
1. Extract all values: suction/discharge psig, sat temps, SH, SC, refrigerant, ambient, alerts
2. Unreadable = ask for retake, never guess
3. Confirm back: "R-[x] | Suction: [x]psig/[x]°F | Discharge: [x]psig/[x]°F | SH: [x]°F | SC: [x]°F — confirm and I'll dig in"
4. After confirmation only — analyze all five together. Never in isolation

BRAND FAULT CODES:
- Carrier Infinity: pull HISTORY always — comm drops don't store as active faults. E44=blower comm. Swap thermostat before condemning board
- Trane: 2=flame fail; 3=pressure switch; 4=overheat; 5=flame with no call (leaky gas valve); F0=low refrigerant
- Lennox: E200=high limit; E201=pressure switch; E202=flame sensor; E203=ignition fail; E212=high pressure; E213=low pressure; E217=blower (check tach wire before ECM). iComfort comm fault: see CONFIRMED DIAGNOSIS above
- Rheem/Ruud: 2=PS open; 3=limit open; 4=PS stuck closed; 01=ignition fail; 02=flame fail; 07=fan motor
- Goodman/Amana: 6=compressor short cycle; constant flash=reversed polarity
- Mitsubishi mini-split: E1=comm; E6=drain; H5=IPM; P4=compressor overtemp; P6=compressor lock; dF=defrost (normal — diagnose only if >15 min)
- York/JCI: B-terminal heat pump. Blink: 1=contactor stuck; 2=compressor OL; 3=PS stuck
- Daikin: P6=compressor lock. Fixed orifice pistons non-standard — never swap between units
- Fujitsu: dF normal. F1=outdoor sensor; F4=low temp; F5=high pressure. Charge by weight
- Bosch: B-terminal heat pump. E13=low voltage — measure under compressor load not idle
- ICP/Heil/Tempstar: same unit, parts interchangeable. Control fuse 3A
- Heat pump terminal: O=energized cooling (Carrier/Trane/Lennox/Goodman/Daikin/Mitsubishi/Fujitsu). B=energized heating (Rheem/Ruud/Bosch/York)

COMBUSTION ANALYSIS (numbers Sonnet won't guess right):
- CO as-measured: <50 ppm ideal; >100 ppm investigate; >400 ppm air-free (COAF) = immediate shutdown + red tag
- COAF = CO corrected for dilution air — always use COAF for shutdown decisions, not raw reading
- CO₂ natural gas target: 8–10%. Above 10% = dangerously tight on excess air
- O₂ target: 6–9%. O₂ and CO₂ are inverse — if they don't track opposite, suspect analyzer drift or calibration error
- Excess air target: 35–75%
- Stack temp: 80% furnace = 325–500°F; 90%+ condensing = 130–140°F
- CO spikes when blower starts = cracked heat exchanger — treat as emergency, shut down, do not restart

FLAME SENSOR:
- Reads in DC microamps. Good: 2–6 µA. Below 1 µA = clean or replace. Multimeter must be in DC µA mode

REFRIGERANT TRANSITION (regulatory facts — current as of 2026):
- R-410A: no new equipment since Jan 1 2025; reclaimed/recovered only as of Jan 1 2026; prices $25–45/lb and rising
- R-454B (Opteon XL41 / Puron Advance): new U.S. standard — adopted by Carrier, Trane, Lennox, York. A2L, GWP 466, ignites at 925°F
- R-32: A2L alternative, dominant in EU/Asia, GWP 675
- A2L systems require updated certification — do not service without it
- No drop-in swap R-410A → R-454B: different lubricant, different operating pressures, different manifold gauges required. Tell customer this if asked about switching`;



function makeWelcome(dp) {
  if (dp?.brand) {
    const lines = [
      `**${[dp.brand, dp.unit_type].filter(Boolean).join(' ').toUpperCase()}**`,
      dp.model            ? `- Model: ${dp.model}` : null,
      dp.serial           ? `- Serial: ${dp.serial}` : null,
      dp.refrigerant_type ? `- Refrigerant: ${dp.refrigerant_type}` : null,
      dp.tonnage          ? `- Tonnage: ${dp.tonnage}` : null,
      dp.voltage          ? `- Voltage: ${dp.voltage}` : null,
    ].filter(Boolean).join('\n');
    return {
      role: "assistant",
      content: `**Senior Tech here.** Read the nameplate:\n\n${lines}\n\nWhat's the complaint?`,
    };
  }
  return {
    role: "assistant",
    content: "**Senior Tech here.** Ready to diagnose.\n\nDescribe the issue, send a fault code, or photograph any gauge readings, wiring, or components.",
  };
}

// Onboarding form shown on first launch
function OnboardingScreen({ onComplete }) {
  const [form, setForm] = useState({ name: "", years: "", company: "", temp_unit: "F" });
  const [err, setErr]   = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) { setErr("Please enter your name."); return; }
    const profile = {
      name:      form.name.trim(),
      title:     "HVAC TECHNICIAN",
      company:   form.company.trim(),
      years:     form.years || "1",
      temp_unit: form.temp_unit,
    };
    localStorage.setItem("senior_tech_profile", JSON.stringify(profile));
    localStorage.setItem("onboarding_done", "1");
    onComplete(profile);
  };

  const fieldStyle = {
    width: "100%", boxSizing: "border-box",
    background: "var(--bg-elevated)", border: "1px solid var(--border)",
    borderRadius: 6, padding: "13px 14px",
    color: "var(--text-primary)", fontFamily: "'Inter', sans-serif", fontSize: 15,
    outline: "none",
  };
  const labelStyle = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 6, display: "block",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "var(--bg)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "24px 24px 40px",
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div className="hexagon" style={{
          width: 72, height: 72, background: "rgba(79,195,247,0.12)",
          border: "1px solid rgba(79,195,247,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px",
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 28, fontWeight: 900, color: "var(--blue)",
          textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1,
        }}>SENIOR TECH</div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 4,
        }}>SET UP YOUR PROFILE</div>
      </div>

      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>FULL NAME *</label>
          <input
            style={fieldStyle} placeholder="First Last"
            value={form.name} onChange={e => set("name", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "var(--blue)"; e.target.style.boxShadow = "0 0 0 2px rgba(79,195,247,0.12)"; }}
            onBlur={e =>  { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Company */}
        <div>
          <label style={labelStyle}>COMPANY NAME</label>
          <input
            style={fieldStyle} placeholder="Your company (optional)"
            value={form.company} onChange={e => set("company", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "var(--blue)"; e.target.style.boxShadow = "0 0 0 2px rgba(79,195,247,0.12)"; }}
            onBlur={e =>  { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Years */}
        <div>
          <label style={labelStyle}>YEARS IN THE TRADE</label>
          <input
            style={fieldStyle} placeholder="e.g. 12" type="number" min="0" max="50"
            value={form.years} onChange={e => set("years", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "var(--blue)"; e.target.style.boxShadow = "0 0 0 2px rgba(79,195,247,0.12)"; }}
            onBlur={e =>  { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Temp unit */}
        <div>
          <label style={labelStyle}>TEMPERATURE UNIT</label>
          <div style={{ display: "flex", gap: 10 }}>
            {["F", "C"].map(u => (
              <button key={u} onClick={() => set("temp_unit", u)} style={{
                flex: 1, height: 48, borderRadius: 6, cursor: "pointer",
                border: `1px solid ${form.temp_unit === u ? "var(--blue)" : "var(--border)"}`,
                background: form.temp_unit === u ? "rgba(79,195,247,0.12)" : "var(--bg-elevated)",
                color: form.temp_unit === u ? "var(--blue)" : "var(--text-muted)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 16, fontWeight: 700,
              }}>
                °{u} {u === "F" ? "FAHRENHEIT" : "CELSIUS"}
              </button>
            ))}
          </div>
        </div>

        {err && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
            color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.08em",
          }}>{err}</div>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: "100%", height: 52, borderRadius: 6, border: "none",
            background: "var(--blue)", color: "#0f0f0f", cursor: "pointer",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 16, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em",
            boxShadow: "0 0 20px rgba(79,195,247,0.25)",
            marginTop: 4,
          }}
        >
          START DIAGNOSING
        </button>
      </div>
    </div>
  );
}

export default function DiagnosePage() {
  const [profile, setProfile] = useState(loadProfile);
  const [dataPlate, setDataPlate] = useState(loadDataPlate);
  const needsOnboarding = false; // handled by /onboarding route in App.jsx

  const [messages, setMessages] = useState(() => {
    return loadMsgs() || [makeWelcome(loadDataPlate())];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted]     = useState(loadStarted);
  const [summaryModal, setSummaryModal] = useState({ open: false, text: "", loading: false, customRequest: "" });
  const [summaryReady, setSummaryReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dpScanning, setDpScanning]   = useState(false);
  const [dpDismissed, setDpDismissed] = useState(() => !!loadDataPlate());
  const ticketIdRef  = useRef(localStorage.getItem(TICKET_KEY) || null);
  const chatEndRef   = useRef(null);
  const dpCaptureRef = useRef(null);
  const dpUploadRef  = useRef(null);

  const handleOnboardingComplete = (newProfile) => {
    setProfile(newProfile);
    const welcome = makeWelcome();
    setMessages([welcome]);
    saveMsgs([welcome]);
  };

  // Persist messages to localStorage on every change
  useEffect(() => { saveMsgs(messages); }, [messages]);
  useEffect(() => { localStorage.setItem(STARTED_KEY, started); }, [started]);

  // Auto-upsert ticket in TicketStore whenever messages change
  useEffect(() => {
    const userMsgs = messages.filter(m => m.role === "user");
    if (userMsgs.length === 0) return;
    if (!ticketIdRef.current) {
      const id = Date.now().toString();
      ticketIdRef.current = id;
      localStorage.setItem(TICKET_KEY, id);
      TicketStore.save({
        id,
        created_date: new Date().toISOString(),
        messages,
        status: "in_progress",
        notes: "",
        safety_flagged: false,
        summary: null,
      });
    } else {
      TicketStore.update(ticketIdRef.current, { messages });
    }
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Returns { system, userPrompt } separately so server can cache the static system prompt
  const buildMessages = (newMsg, msgHistory) => {
    const profile = loadProfile();
    const years   = parseInt(profile.years, 10) || 5;
    const unit    = profile.temp_unit === "C" ? "Celsius (°C)" : "Fahrenheit (°F)";
    const techName = profile.name || "Tech";
    const expLevel = years <= 3
      ? "APPRENTICE (0-3 yrs) — explain the why behind every step"
      : years <= 10
        ? "JOURNEYMAN (4-10 yrs) — skip basics, focus on what to check and what it means"
        : "MASTER (11+ yrs) — peer level, just key differentiators, no hand-holding";

    let ctx = `TECH PROFILE — calibrate every response to this:\n- Name: ${techName}\n- Years in trade: ${years}\n- Level: ${expLevel}\n- Temperature unit: ${unit} — use this unit for ALL temperatures in every response`;

    const dp = loadDataPlate();
    if (dp?.brand) {
      ctx += `\n\nCURRENT UNIT — already read from data plate, NEVER ask for this info again:\n- Brand: ${dp.brand}${dp.model ? `\n- Model: ${dp.model}` : ''}${dp.serial ? `\n- Serial: ${dp.serial}` : ''}${dp.unit_type ? `\n- Type: ${dp.unit_type}` : ''}${dp.refrigerant_type ? `\n- Refrigerant: ${dp.refrigerant_type}` : ''}${dp.tonnage ? `\n- Tonnage: ${dp.tonnage}` : ''}${dp.voltage ? `\n- Voltage: ${dp.voltage}` : ''}`;
    }

    const src = msgHistory || messages;
    // Always include first 2 messages (data plate / opening context) + last 4 recent messages
    const first2 = src.slice(0, 2);
    const last4  = src.slice(-4);
    const combined = src.length <= 6
      ? src
      : [...first2, ...last4.filter(m => !first2.includes(m))];
    const history = [...combined, { role: "user", content: newMsg }]
      .map(m => {
        const photoNote = m.images?.length ? ' [sent photo]' : '';
        return `${m.role === "user" ? "Tech" : "Senior Tech"}: ${m.content}${photoNote}`;
      })
      .join("\n\n");

    return {
      // SYSTEM_PROMPT is static — server will cache it (90% discount after first call)
      system: SYSTEM_PROMPT,
      // profileCtx + conversation go in the user message
      userPrompt: `${ctx}\n\n--- CONVERSATION ---\n${history}\n\nSenior Tech:`,
    };
  };

  // Returns a manufacturer resource link for a given brand, or null
  const getMfgLink = (brand) => {
    const bl = brand.toLowerCase();
    if (bl.includes('carrier'))                             return { type: "Manufacturer", title: "Carrier Technical Resources",    url: "https://www.carrier.com/residential/en/us/support/",                  source: "Carrier" };
    if (bl.includes('trane'))                              return { type: "Manufacturer", title: "Trane Technical Resources",      url: "https://www.trane.com/residential/en/resources/",                     source: "Trane" };
    if (bl.includes('lennox'))                             return { type: "Manufacturer", title: "Lennox Technical Resources",     url: "https://www.lennox.com/dealers/technical-support",                    source: "Lennox" };
    if (bl.includes('rheem') || bl.includes('ruud'))       return { type: "Manufacturer", title: "Rheem Technical Literature",    url: "https://www.rheem.com/technical-literature/",                         source: "Rheem" };
    if (bl.includes('goodman') || bl.includes('amana'))    return { type: "Manufacturer", title: "Goodman Technical Resources",   url: "https://www.goodmanmfg.com/resources/customer-resources",             source: "Goodman" };
    if (bl.includes('york'))                               return { type: "Manufacturer", title: "York Technical Resources",      url: "https://www.johnsoncontrols.com/hvac-and-refrigeration",              source: "York" };
    if (bl.includes('daikin'))                             return { type: "Manufacturer", title: "Daikin Technical Resources",    url: "https://daikincomfort.com/professional-support/technical-support",    source: "Daikin" };
    if (bl.includes('mitsubishi'))                         return { type: "Manufacturer", title: "Mitsubishi Technical Resources", url: "https://www.mitsubishicomfort.com/contractors/tech-resources",       source: "Mitsubishi" };
    if (bl.includes('fujitsu'))                            return { type: "Manufacturer", title: "Fujitsu Technical Resources",   url: "https://www.fujitsugeneral.com/us/resources/",                        source: "Fujitsu" };
    return null;
  };

  // Compress image to JPEG — always resolves, never rejects
  // Uses FileReader as fallback if canvas fails (iOS PWA edge case)
  const compressImage = (file) => new Promise((resolve) => {
    const MAX = 1200;
    const QUALITY = 0.75;

    const tryCanvas = (dataUrl) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else                { width  = Math.round(width  * MAX / height); height = MAX; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", QUALITY);
          resolve(compressed);
        } catch {
          // Canvas failed — send the original FileReader data URL
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };

    // Always read via FileReader first (works on all iOS PWA contexts)
    const reader = new FileReader();
    reader.onload = (e) => tryCanvas(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

  // Called when tech photographs or uploads data plate before starting the chat
  const handleDpPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setDpScanning(true);
    let extracted = null;
    try {
      const file_url = await compressImage(file);
      if (!file_url) throw new Error("Could not read image file.");
      extracted = await llm({
        prompt: "Extract from this HVAC nameplate and return only raw JSON: brand, model, serial, unit_type, refrigerant_type, tonnage, voltage. Use null for any field not visible.",
        images: [file_url],
        model: "claude_sonnet_4_6",
        max_tokens: 200,
        json: {
          type: "object",
          properties: {
            brand:            { type: "string" },
            model:            { type: "string" },
            serial:           { type: "string" },
            unit_type:        { type: "string" },
            refrigerant_type: { type: "string" },
            tonnage:          { type: "string" },
            voltage:          { type: "string" },
          }
        }
      });
    } catch (err) {
      // Show the real error in chat so the tech knows what happened
      const errMsg = { role: "assistant", content: `Could not read data plate: ${err.message}. You can still describe the unit manually.` };
      setMessages([errMsg]);
    } finally {
      setDpScanning(false);
      setDpDismissed(true);
    }

    if (!extracted?.brand) return;

    // Extraction succeeded — set up chat with unit context
    saveDataPlate(extracted);
    setDataPlate(extracted);
    const welcome = makeWelcome(extracted);
    setMessages([welcome]);
    saveMsgs([welcome]);

    // Fetch manuals in background — inject chat message when done
    try {
      const brand = extracted.brand.trim();
      const model = extracted.model?.trim() || '';
      const res = await fetch(`/api/find-manual?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`);
      const { manuals } = await res.json();
      const docs = manuals?.length > 0 ? manuals.map(m => ({ ...m, source: "ManualsLib" })) : [];
      const mfg = getMfgLink(brand);
      if (mfg) docs.push(mfg);
      if (docs.length > 0) {
        ManualsStore.save({
          id: Date.now().toString(),
          created_date: new Date().toISOString(),
          unit: extracted,
          documents: docs,
          unit_summary: `${brand}${model ? ' ' + model : ''}${extracted.unit_type ? ' — ' + extracted.unit_type : ''}`,
        });
        const lines = docs.map(d => `- [${d.title}](${d.url})`).join('\n');
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `**Manuals loaded for ${brand}${model ? ' ' + model : ''}:**\n${lines}\n\nAvailable in the Manuals tab.`,
        }]);
      }
    } catch { /* silent — manuals are a bonus, not critical */ }
  };

  const sendMessage = async (text, imageUrls = []) => {
    setStarted(true);
    const userMsg = { role: "user", content: text, images: imageUrls };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setIsLoading(true);
    try {
      const { system, userPrompt } = buildMessages(text, messages);
      const response = await llm({
        prompt: userPrompt,
        system,
        model: "claude_sonnet_4_6",
        max_tokens: 800,
        ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
      });
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    }
    setIsLoading(false);
  };

  const handleGenerateSummary = async (customRequest = "") => {
    setSummaryModal(s => ({ ...s, text: "", loading: true }));
    try {
      const transcript = messages
        .filter(m => m.role !== "assistant" || m !== messages[0]) // skip welcome msg
        .map(m => `${m.role === "user" ? "Tech" : "Senior Tech"}: ${m.content}`)
        .join("\n\n");
      const profile = loadProfile();
      const hasConversation = messages.filter(m => m.role === "user").length > 0;

      const prompt = customRequest.trim()
        ? `You are an HVAC service writer. Write a brief customer-facing summary that can be pasted directly into an invoicing app. The technician says: "${customRequest.trim()}"\n\nFormat as short bullet points:\n• Equipment: [brand/model if mentioned, else "See nameplate"]\n• Work performed: [what was done]\n• Recommendations: [if any]\n\nPlain language, no jargon, 5 lines max.`
        : `You are an HVAC service writer. Based on the conversation below, write a brief customer-facing summary to paste into an invoicing app.\n\nFormat as short bullet points only — no headers, no extra text:\n• Equipment: [brand/model/type — or "See nameplate" if unknown]\n• Issue: [one sentence what customer reported]\n• Findings: [what was found — plain language]\n• Work performed: [what was done]\n• Recommendations: [next steps or parts needed, or "None"]\n\nKeep it under 8 lines. No jargon. If minimal info, keep it brief.\n\nConversation:\n${transcript || "(No conversation — tech used app for reference only.)"}`;

      const response = await llm({
        prompt,
        model: "claude_haiku_4_5",
        max_tokens: 350,
      });
      setSummaryModal(s => ({ ...s, text: response, loading: false }));
      setSummaryReady(true);
    } catch {
      setSummaryModal(s => ({ ...s, text: "Could not generate summary — check your connection.", loading: false }));
    }
  };

  const handleOpenSummary = () => {
    setSummaryModal({ open: true, text: "", loading: true, customRequest: "" });
    handleGenerateSummary("");
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryModal.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNewChat = async () => {
    // Background: extract unit + fault summary for the current ticket
    if (ticketIdRef.current && messages.filter(m => m.role === "user").length > 0) {
      try {
        const transcript = messages.slice(0, 12)
          .map(m => `${m.role === "user" ? "Tech" : "Senior Tech"}: ${m.content}`)
          .join("\n\n");
        const s = await llm({
          prompt: `Extract structured info from this HVAC diagnostic conversation. Return JSON only. If a field isn't mentioned, return null for it.\n\n${transcript}`,
          model: "claude_haiku_4_5",
          max_tokens: 150,
          json: {
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
          TicketStore.update(ticketIdRef.current, { summary: s });
        }
      } catch { /* silent */ }
    }
    ticketIdRef.current = null;
    localStorage.removeItem(TICKET_KEY);
    clearDataPlate();
    setDataPlate(null);
    setDpDismissed(false);
    setSummaryReady(false);
    const welcome = makeWelcome();
    setMessages([welcome]);
    saveMsgs([welcome]);
    setStarted(false);
  };

  if (needsOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 124px)" }}>

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
            fontSize: 26, fontWeight: 900, color: "var(--text-primary)",
            textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1,
          }}>
            SENIOR TECH
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, fontWeight: 600, color: "var(--blue)",
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

        {/* Data plate prompt — shown before first message if no unit locked */}
        {!dpDismissed && (
          <div style={{ padding: "0 16px 14px", flexShrink: 0 }}>
            <input ref={dpCaptureRef} type="file" accept="image/*" capture="environment" onChange={handleDpPhoto} style={{ display: "none" }} />
            <input ref={dpUploadRef}  type="file" accept="image/*" onChange={handleDpPhoto} style={{ display: "none" }} />
            <div style={{
              borderRadius: 10, padding: "14px 16px",
              background: "rgba(79,195,247,0.06)",
              border: "1px solid rgba(79,195,247,0.2)",
            }}>
              <p style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, fontWeight: 700, color: "var(--blue)",
                textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 3,
              }}>STEP 1 — DATA PLATE</p>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5,
              }}>
                Photograph the unit nameplate. Senior Tech will pre-fill unit info and auto-load manuals.
              </p>
              {dpScanning ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 size={13} color="var(--blue)" style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: "var(--blue)", letterSpacing: "0.1em", textTransform: "uppercase" }}>READING DATA PLATE...</span>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <button onClick={() => dpCaptureRef.current?.click()} style={{
                      flex: 1, height: 42, borderRadius: 8,
                      background: "var(--blue)", color: "#0f0f0f", border: "none",
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <Camera size={14} /> PHOTOGRAPH
                    </button>
                    <button onClick={() => dpUploadRef.current?.click()} style={{
                      flex: 1, height: 42, borderRadius: 8,
                      background: "var(--bg-elevated)", color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <Upload size={14} /> UPLOAD
                    </button>
                  </div>
                  <button onClick={() => setDpDismissed(true)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                    color: "var(--text-muted)", textTransform: "uppercase",
                    letterSpacing: "0.1em", textDecoration: "underline",
                  }}>
                    Skip — describe the issue
                  </button>
                </>
              )}
            </div>
          </div>
        )}

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

      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        onSummary={handleOpenSummary}
        summaryGenerating={summaryModal.loading}
        summaryReady={summaryReady}
        onNewChat={started ? handleNewChat : null}
      />

      {/* Summary Modal */}
      {summaryModal.open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }} onClick={() => setSummaryModal(s => ({ ...s, open: false }))}>
          <div
            style={{
              width: "100%", maxWidth: 600,
              background: "var(--bg-card)",
              borderTop: `2px solid ${summaryReady ? "var(--green)" : "var(--blue)"}`,
              borderRadius: "16px 16px 0 0",
              maxHeight: "85dvh", display: "flex", flexDirection: "column",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 15, fontWeight: 900, textTransform: "uppercase",
                letterSpacing: "0.1em", color: summaryReady ? "var(--green)" : "var(--blue)",
              }}>CUSTOMER SUMMARY</span>
              <div style={{ display: "flex", gap: 8 }}>
                {!summaryModal.loading && summaryModal.text && (
                  <button
                    onClick={handleCopySummary}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: 6,
                      background: copied ? "rgba(76,175,80,0.2)" : "rgba(76,175,80,0.12)",
                      border: "1px solid var(--green)",
                      color: "var(--green)",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.08em", cursor: "pointer",
                    }}
                  >
                    {copied ? <><Check size={13} /> COPIED</> : <><Copy size={13} /> COPY</>}
                  </button>
                )}
                <button
                  onClick={() => setSummaryModal(s => ({ ...s, open: false }))}
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "var(--text-muted)",
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Custom request input */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={summaryModal.customRequest}
                  onChange={e => setSummaryModal(s => ({ ...s, customRequest: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") handleGenerateSummary(summaryModal.customRequest); }}
                  placeholder='e.g. "replaced dual run capacitor on York 5-ton condenser"'
                  style={{
                    flex: 1, background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "9px 12px",
                    color: "var(--text-primary)", fontFamily: "'Inter', sans-serif", fontSize: 13,
                    outline: "none",
                  }}
                  onFocus={e => { e.target.style.borderColor = "var(--blue)"; }}
                  onBlur={e =>  { e.target.style.borderColor = "var(--border)"; }}
                />
                <button
                  onClick={() => handleGenerateSummary(summaryModal.customRequest)}
                  disabled={summaryModal.loading}
                  style={{
                    padding: "0 14px", borderRadius: 6,
                    background: "rgba(79,195,247,0.12)", border: "1px solid var(--blue)",
                    color: "var(--blue)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {summaryModal.loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "GENERATE"}
                </button>
              </div>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 11, color: "var(--text-muted)",
                margin: "6px 0 0", lineHeight: 1.4,
              }}>
                Describe the job or leave blank to summarize from conversation
              </p>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {summaryModal.loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 0" }}>
                  <Loader2 size={28} color="var(--blue)" style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em",
                  }}>WRITING SUMMARY...</span>
                </div>
              ) : (
                <pre style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13,
                  color: "var(--text-primary)", lineHeight: 1.7,
                  whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
                }}>
                  {summaryModal.text}
                </pre>
              )}
            </div>

            {!summaryModal.loading && summaryModal.text && (
              <div style={{ padding: "10px 16px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
                <p style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase",
                  letterSpacing: "0.1em", textAlign: "center",
                }}>
                  TAP COPY → PASTE INTO YOUR INVOICING APP
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
