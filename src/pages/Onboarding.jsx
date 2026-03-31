import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const STEP_COUNT = 4;

function WrenchIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function Logo({ subtitle }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: "rgba(79,195,247,0.1)", border: "1px solid rgba(79,195,247,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
      }}>
        <WrenchIcon />
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 30, fontWeight: 900, color: "var(--blue)",
        textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1,
      }}>SENIOR TECH</div>
      {subtitle && (
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 5,
        }}>{subtitle}</div>
      )}
    </div>
  );
}

function ProgressBar({ step }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 32, justifyContent: "center" }}>
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <div key={i} style={{
          height: 3, width: 36, borderRadius: 2,
          background: i < step ? "var(--blue)" : "rgba(255,255,255,0.1)",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

const fieldStyle = {
  width: "100%", boxSizing: "border-box",
  background: "var(--bg-elevated)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "13px 14px",
  color: "var(--text-primary)", fontFamily: "'Inter', sans-serif", fontSize: 15,
  outline: "none",
};
const labelStyle = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 6, display: "block",
};

// ── Step 1: Welcome ──────────────────────────────────────────────────────────
function StepWelcome({ onNext }) {
  return (
    <div style={{ textAlign: "center" }}>
      <Logo subtitle="AI HVAC DIAGNOSTIC ASSISTANT" />
      <p style={{
        fontFamily: "'Inter', sans-serif", fontSize: 15,
        color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 12,
      }}>
        Built for certified residential and light commercial HVAC technicians.
      </p>
      <p style={{
        fontFamily: "'Inter', sans-serif", fontSize: 13,
        color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 36,
      }}>
        Set up takes about 60 seconds. We'll collect your profile, verify certifications, and confirm you've read the legal terms before you start diagnosing.
      </p>
      <button onClick={onNext} style={primaryBtn}>GET STARTED</button>
    </div>
  );
}

// ── Step 2: Profile ───────────────────────────────────────────────────────────
function StepProfile({ onNext }) {
  const [form, setForm] = useState({ name: "", years: "", company: "", temp_unit: "F" });
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleNext = () => {
    if (!form.name.trim()) { setErr("Full name is required."); return; }
    localStorage.setItem("senior_tech_profile", JSON.stringify({
      name:      form.name.trim(),
      title:     "HVAC TECHNICIAN",
      company:   form.company.trim(),
      years:     form.years || "1",
      temp_unit: form.temp_unit,
    }));
    onNext();
  };

  return (
    <div>
      <ProgressBar step={1} />
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>YOUR PROFILE</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>This calibrates Senior Tech to your experience level.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>FULL NAME *</label>
          <input style={fieldStyle} placeholder="First Last" value={form.name}
            onChange={e => set("name", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "var(--blue)"; }}
            onBlur={e =>  { e.target.style.borderColor = "var(--border)"; }} />
        </div>
        <div>
          <label style={labelStyle}>COMPANY NAME</label>
          <input style={fieldStyle} placeholder="Your company (optional)" value={form.company}
            onChange={e => set("company", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "var(--blue)"; }}
            onBlur={e =>  { e.target.style.borderColor = "var(--border)"; }} />
        </div>
        <div>
          <label style={labelStyle}>YEARS IN THE TRADE</label>
          <input style={fieldStyle} placeholder="e.g. 8" type="number" min="0" max="50"
            value={form.years} onChange={e => set("years", e.target.value)}
            onFocus={e => { e.target.style.borderColor = "var(--blue)"; }}
            onBlur={e =>  { e.target.style.borderColor = "var(--border)"; }} />
        </div>
        <div>
          <label style={labelStyle}>TEMPERATURE UNIT</label>
          <div style={{ display: "flex", gap: 10 }}>
            {["F", "C"].map(u => (
              <button key={u} onClick={() => set("temp_unit", u)} style={{
                flex: 1, height: 48, borderRadius: 8, cursor: "pointer",
                border: `1px solid ${form.temp_unit === u ? "var(--blue)" : "var(--border)"}`,
                background: form.temp_unit === u ? "rgba(79,195,247,0.1)" : "var(--bg-elevated)",
                color: form.temp_unit === u ? "var(--blue)" : "var(--text-muted)",
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700,
                transition: "all 0.15s",
              }}>
                °{u} {u === "F" ? "FAHRENHEIT" : "CELSIUS"}
              </button>
            ))}
          </div>
        </div>
        {err && <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{err}</div>}
        <button onClick={handleNext} style={{ ...primaryBtn, marginTop: 8 }}>NEXT</button>
      </div>
    </div>
  );
}

// ── Step 3: EPA & Certifications ─────────────────────────────────────────────
function StepCertifications({ onNext }) {
  const [checks, setChecks] = useState({ epa608: false, a2l: false, osha: false, licensed: false });
  const [err, setErr] = useState("");
  const toggle = k => setChecks(c => ({ ...c, [k]: !c[k] }));

  const handleNext = () => {
    if (!checks.epa608) { setErr("EPA Section 608 certification acknowledgment is required."); return; }
    if (!checks.a2l)    { setErr("A2L refrigerant safety acknowledgment is required."); return; }
    setErr("");
    onNext();
  };

  const items = [
    {
      key: "epa608",
      required: true,
      title: "EPA Section 608 Certification",
      body: "I hold a current, valid EPA Section 608 technician certification and am legally authorized to purchase, handle, recover, and recycle refrigerants as required by 40 CFR Part 82.",
    },
    {
      key: "a2l",
      required: true,
      title: "A2L Refrigerant Safety (R-454B / R-32)",
      body: "I understand that A2L refrigerants (R-454B, R-32) are mildly flammable, require updated HVACR safety training and equipment, and that I will not service A2L systems without proper A2L-specific certification and tools.",
    },
    {
      key: "osha",
      required: false,
      title: "Electrical & OSHA Safety",
      body: "I follow applicable OSHA standards, NFPA 70E electrical safety requirements, and all local codes when working on energized equipment. I acknowledge that live-voltage steps carry risk of serious injury or death.",
    },
    {
      key: "licensed",
      required: false,
      title: "State / Local Licensing",
      body: "I hold all state and local licenses required to perform HVAC work in my jurisdiction, or I am working under the direct supervision of a licensed contractor.",
    },
  ];

  return (
    <div>
      <ProgressBar step={2} />
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>CERTIFICATIONS</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Items marked * are required to use this app.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map(({ key, required, title, body }) => (
          <button key={key} onClick={() => toggle(key)} style={{
            textAlign: "left", background: checks[key] ? "rgba(79,195,247,0.07)" : "var(--bg-elevated)",
            border: `1px solid ${checks[key] ? "rgba(79,195,247,0.35)" : "var(--border)"}`,
            borderRadius: 10, padding: "14px 14px 14px 46px", cursor: "pointer",
            position: "relative", transition: "all 0.15s",
          }}>
            {/* Checkbox */}
            <div style={{
              position: "absolute", top: 14, left: 14,
              width: 20, height: 20, borderRadius: 5,
              border: `2px solid ${checks[key] ? "var(--blue)" : "var(--border)"}`,
              background: checks[key] ? "var(--blue)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.15s",
            }}>
              {checks[key] && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <polyline points="2,6 5,9 10,3" stroke="#0f0f0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: checks[key] ? "var(--blue)" : "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              {title}{required && <span style={{ color: "var(--red)", marginLeft: 4 }}>*</span>}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>{body}</div>
          </button>
        ))}
      </div>
      {err && <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 12 }}>{err}</div>}
      <button onClick={handleNext} style={{ ...primaryBtn, marginTop: 20 }}>NEXT</button>
    </div>
  );
}

// ── Step 4: Legal Agreement ───────────────────────────────────────────────────
function StepLegal({ onComplete }) {
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState("");

  const handleComplete = () => {
    if (!agreed) { setErr("You must accept the terms to continue."); return; }
    localStorage.setItem("onboarding_done", "1");
    onComplete();
  };

  return (
    <div>
      <ProgressBar step={3} />
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>TERMS OF USE</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Read carefully before using Senior Tech.</div>
      </div>

      {/* Scrollable legal block */}
      <div style={{
        background: "var(--bg-elevated)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "16px", maxHeight: 320, overflowY: "auto",
        marginBottom: 20,
      }}>
        {[
          {
            heading: "1. AI Diagnostic Tool — Not a Substitute for Professional Judgment",
            body: "Senior Tech is an AI-assisted diagnostic aid intended for use by trained and certified HVAC professionals. All recommendations, fault code interpretations, and diagnostic suggestions are informational only. You are solely responsible for all diagnostic conclusions, repairs, and decisions made in the field. Never perform any repair or adjustment based solely on AI output without applying your own professional knowledge and judgment.",
          },
          {
            heading: "2. No Liability for Field Decisions",
            body: "The developers of Senior Tech accept no liability for personal injury, property damage, equipment failure, regulatory violations, or any other consequence arising from actions taken in reliance on information provided by this application. HVAC work involves hazardous voltages, pressurized refrigerant systems, combustible gases, and rotating machinery. You assume all risk.",
          },
          {
            heading: "3. Refrigerant Regulations (EPA Section 608 / Clean Air Act)",
            body: "You acknowledge that purchasing, handling, recovering, and venting refrigerants is regulated under 40 CFR Part 82 (Section 608 of the Clean Air Act). Intentional venting of regulated refrigerants is illegal. You are responsible for compliance with all applicable EPA regulations, including proper refrigerant recovery, reclaim, and disposal.",
          },
          {
            heading: "4. A2L Refrigerant Safety",
            body: "R-454B, R-32, and other A2L (mildly flammable) refrigerants require specific handling procedures, tools, and training. Senior Tech may provide information about A2L systems. You are responsible for ensuring you have the proper training, equipment, and certification before working with A2L refrigerants.",
          },
          {
            heading: "5. Electrical Safety",
            body: "HVAC systems operate at potentially lethal voltages. Always de-energize, lock out, and tag out equipment before working on electrical components unless diagnostic procedures specifically require the system to be energized. Follow NFPA 70E, OSHA 1910.333, and all applicable electrical safety standards.",
          },
          {
            heading: "6. Professional Use Only",
            body: "This application is intended solely for use by certified HVAC professionals. It is not intended for use by homeowners or untrained individuals. By using this app you represent that you are a trained HVAC technician with the skills and certifications required to safely perform the work described.",
          },
          {
            heading: "7. Data & Privacy",
            body: "Diagnostic conversations are processed by Anthropic's Claude AI. Photos, model numbers, serial numbers, and conversation data may be transmitted to third-party AI and search services for processing. No data is stored on our servers — all session data is stored locally on your device only. Do not enter personally identifiable customer information into chat.",
          },
        ].map(({ heading, body }) => (
          <div key={heading} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{heading}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{body}</div>
          </div>
        ))}
      </div>

      {/* Agree checkbox */}
      <button onClick={() => setAgreed(a => !a)} style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        background: agreed ? "rgba(79,195,247,0.07)" : "var(--bg-elevated)",
        border: `1px solid ${agreed ? "rgba(79,195,247,0.35)" : "var(--border)"}`,
        borderRadius: 10, padding: "14px", cursor: "pointer", textAlign: "left",
        width: "100%", marginBottom: 16, transition: "all 0.15s",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${agreed ? "var(--blue)" : "var(--border)"}`,
          background: agreed ? "var(--blue)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>
          {agreed && (
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
              <polyline points="2,6 5,9 10,3" stroke="#0f0f0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
          I have read and agree to these Terms of Use. I am a certified HVAC professional and I accept full responsibility for all field decisions made while using Senior Tech.
        </div>
      </button>

      {err && <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{err}</div>}
      <button onClick={handleComplete} style={primaryBtn}>START DIAGNOSING</button>
    </div>
  );
}

// ── Primary button style ──────────────────────────────────────────────────────
const primaryBtn = {
  width: "100%", height: 52, borderRadius: 8, border: "none",
  background: "var(--blue)", color: "#0f0f0f", cursor: "pointer",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 16, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em",
  boxShadow: "0 0 20px rgba(79,195,247,0.2)",
};

// ── Main Onboarding Page ──────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const next = () => setStep(s => s + 1);
  const complete = () => navigate("/diagnose", { replace: true });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "var(--bg)", overflowY: "auto",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "40px 24px 60px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {step === 0 && <StepWelcome onNext={next} />}
        {step === 1 && <StepProfile onNext={next} />}
        {step === 2 && <StepCertifications onNext={next} />}
        {step === 3 && <StepLegal onComplete={complete} />}
      </div>
    </div>
  );
}
