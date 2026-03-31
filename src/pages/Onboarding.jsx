import React, { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Check, ChevronRight, Lock, AlertTriangle, Wrench } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const YEAR_CHIPS = ["1-3", "4-7", "8-12", "13-19", "20+"];
const TRADE_CHIPS = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "REFRIGERATION", "ALL"];

const EXP_MAP = {
  "1-3":  { level: "junior",  badge: "JUNIOR TECH — FULL GUIDANCE MODE",   color: "var(--amber)" },
  "4-7":  { level: "mid",     badge: "MID-LEVEL TECH — STANDARD MODE",      color: "var(--blue)" },
  "8-12": { level: "senior",  badge: "SENIOR TECH — PEER MODE",             color: "var(--blue)" },
  "13-19":{ level: "veteran", badge: "VETERAN — DIRECT MODE",               color: "var(--green)" },
  "20+":  { level: "master",  badge: "MASTER TECH — EXPERT MODE",           color: "var(--green)" },
};

const OPENING_MSG = {
  junior:  "Senior Tech here. You're still building the foundation — I'll walk you through every step and explain the why. What are you working on?",
  mid:     "Senior Tech here. Solid experience. I'll guide you through diagnostics and fill in the gaps. What's the call?",
  senior:  "Senior Tech here. We can talk peer-to-peer. What are you working on?",
  veteran: "Good to have you. You've been in the field long enough to know when something's off. I'm here when the calls get weird. What are you working on?",
  master:  "Senior Tech here. You know your craft — I'm a second set of eyes when you need one. What's in front of you?",
};

const CALIBRATION_DESC = {
  junior:  "Senior Tech will explain the why behind each step and walk you through diagnostics thoroughly.",
  mid:     "Senior Tech will guide you through each diagnostic with context and confirmation points.",
  senior:  "Senior Tech will work with you as a peer — direct, thorough, no unnecessary hand-holding.",
  veteran: "Senior Tech gives you direct answers and highlights the non-obvious. No hand-holding.",
  master:  "Senior Tech delivers peer-level input — direct, concise, straight to the diagnosis.",
};

const CHECKBOXES = [
  {
    key: "PROFESSIONAL_CERTIFICATION",
    label: "PROFESSIONAL CERTIFICATION",
    text: "I am a currently licensed and/or certified HVAC professional in good standing. The EPA 608 certification number and state license number I provided are accurate, current, and belong to me personally. I understand that providing false certification information is a material breach of these Terms.",
  },
  {
    key: "ASSUMPTION_OF_RISK",
    label: "ASSUMPTION OF RISK",
    text: "I voluntarily and knowingly assume all risks associated with HVAC service and repair work including exposure to high-voltage electrical systems, high-pressure refrigerant systems, extreme temperatures, confined spaces, and all other inherent hazards of HVAC work.",
  },
  {
    key: "AI_LIMITATIONS",
    label: "AI LIMITATIONS & HALLUCINATION",
    text: "I understand that Senior Tech is powered by AI that may produce inaccurate or incorrect outputs including with apparent confidence. I will independently verify all outputs before taking action and will never rely solely on this app for any safety-critical decision.",
  },
  {
    key: "PROFESSIONAL_RESPONSIBILITY",
    label: "PROFESSIONAL RESPONSIBILITY",
    text: "Senior Tech does not replace my professional judgment and is not a substitute for proper training, licensing, or certification. I am solely responsible for all work I perform and all decisions I make.",
  },
  {
    key: "ELECTRICAL_SAFETY",
    label: "ELECTRICAL SAFETY",
    text: "All electrical guidance in this app is informational only. I will comply with all OSHA standards, NEC requirements, Pennsylvania UCC requirements, lockout/tagout procedures, and manufacturer specifications before performing any electrical work.",
  },
  {
    key: "REFRIGERANT_COMPLIANCE",
    label: "REFRIGERANT COMPLIANCE",
    text: "All refrigerant guidance in this app is informational only. I hold a current EPA Section 608 certification and will comply with all applicable EPA regulations and refrigerant handling requirements.",
  },
  {
    key: "NO_ACCOUNT_SHARING",
    label: "NO ACCOUNT SHARING",
    text: "My account is personal to me and may not be used by any other person including employees, apprentices, or co-workers regardless of their license status.",
  },
  {
    key: "FULL_TERMS",
    label: "FULL TERMS OF SERVICE",
    text: "I have read, understood, and agree to be bound by the Senior Tech Terms of Service, Disclaimer, and Assumption of Risk Version 1.2 in their entirety including the mandatory arbitration clause and class action waiver.",
  },
];

const TERMS_SUMMARY = `SENIOR TECH TERMS OF SERVICE — SUMMARY (Version 1.2)

Senior Tech ("the App") provides AI-assisted HVAC diagnostic guidance to currently licensed HVAC professionals. Access to the App and use of its features is conditioned on your acceptance of these Terms.

PROFESSIONAL REQUIREMENT. The App is restricted to licensed and/or certified HVAC professionals. By creating an account, you represent that you hold current, valid certifications and licenses as required by applicable law.

AI DISCLAIMER. The App uses artificial intelligence which may produce inaccurate, incomplete, or incorrect outputs. All diagnostic suggestions, wiring guidance, refrigerant procedures, and other technical content are for informational purposes only. You are solely responsible for independently verifying all App outputs before taking any action.

ASSUMPTION OF RISK. HVAC service work involves exposure to high-voltage electrical systems, high-pressure refrigerant, extreme temperatures, and other hazards. You voluntarily assume all risks associated with your field work.

LIMITATION OF LIABILITY. To the maximum extent permitted by applicable law, EdgeMech Pros LLC and its operators shall not be liable for any damages arising from your use of or reliance on this App, including any injury, property damage, equipment damage, or financial loss.

NO PROFESSIONAL LICENSE. Nothing in this App constitutes professional engineering advice, a contractor recommendation, or a warranty of any kind. All outputs are suggestions only.

ARBITRATION. Any dispute arising from these Terms or your use of the App shall be resolved through binding individual arbitration. You waive any right to a jury trial or class action.

NO ACCOUNT SHARING. Your account is personal to you and may not be shared, transferred, or used by any other person.`;

// ─── Persistence helpers ──────────────────────────────────────────────────────

const STORAGE_KEY  = "st_onboarding";
const COMPLETE_KEY = "st_onboarding_complete";
const PROFILE_KEY  = "senior_tech_profile";

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function saveDraft(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function completeOnboarding(data) {
  // Merge into existing profile
  const existing = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  const profile = {
    ...existing,
    name: `${data.firstName} ${data.lastName}`.trim(),
    first_name: data.firstName,
    last_name: data.lastName,
    company: data.company || existing.company || "",
    epa_608_number: data.epa,
    state_license_number: data.stateLicense,
    experience_level: EXP_MAP[data.yearsRange]?.level || "mid",
    years_experience_range: data.yearsRange,
    trade_focus: data.tradeFocus,
    onboarding_completed_at: new Date().toISOString(),
    terms_version_accepted: "1.2",
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  // Store acknowledgments
  const acks = CHECKBOXES.map(c => ({
    acknowledgment_type: c.key,
    acknowledged_at: new Date().toISOString(),
    app_version: "1.0",
    terms_version: "1.2",
  }));
  localStorage.setItem("st_acknowledgments", JSON.stringify(acks));

  // Mark complete
  localStorage.setItem(COMPLETE_KEY, "true");
  localStorage.removeItem(STORAGE_KEY);

  // TODO: When Supabase is added, write profile + acks rows here
}

// ─── Small reusable components ────────────────────────────────────────────────

function ProgressBar({ step }) {
  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        color: "var(--blue)", marginBottom: 8,
      }}>
        STEP {step} OF 5
      </div>
      <div style={{ height: 2, background: "var(--border)", borderRadius: 2 }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: "var(--blue)",
          width: `${(step / 5) * 100}%`,
          transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}

function Input({ label, required, error, success, type = "text", value, onChange, placeholder, helper, rightSlot }) {
  const borderColor = error ? "var(--red)" : success ? "var(--green)" : "var(--border)";
  const boxShadow   = error ? "0 0 0 1px var(--red)" : success ? "0 0 0 1px var(--green)" : "none";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.1em",
        color: "var(--text-secondary)", marginBottom: 6,
        display: "flex", gap: 4, alignItems: "center",
      }}>
        {label}
        {required && <span style={{ color: "var(--blue)" }}>*</span>}
      </div>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: "100%", height: 48,
            background: "var(--bg)",
            border: `1px solid ${borderColor}`,
            boxShadow,
            borderRadius: 8,
            padding: rightSlot ? "0 44px 0 14px" : "0 14px",
            color: "var(--text-primary)",
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={e => {
            if (!error && !success) {
              e.target.style.borderColor = "var(--blue)";
              e.target.style.boxShadow   = "0 0 0 1px rgba(79,195,247,0.15)";
            }
          }}
          onBlur={e => {
            if (!error && !success) {
              e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow   = "none";
            }
          }}
        />
        {rightSlot && (
          <div style={{ position: "absolute", right: 14, top: 0, height: "100%", display: "flex", alignItems: "center" }}>
            {rightSlot}
          </div>
        )}
      </div>
      {helper && !error && (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          {helper}
        </div>
      )}
      {error && (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "var(--red)", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function PrimaryBtn({ label, onClick, disabled, icon }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", height: 52,
      background: disabled ? "rgba(79,195,247,0.15)" : "var(--blue)",
      color: disabled ? "rgba(79,195,247,0.4)" : "#000",
      border: "none", borderRadius: 8,
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 15, fontWeight: 900,
      textTransform: "uppercase", letterSpacing: "0.1em",
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      transition: "background 0.2s, color 0.2s",
      animation: !disabled ? undefined : undefined,
    }}>
      {icon}
      {label}
    </button>
  );
}

function SecondaryBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", height: 48,
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 14, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.1em",
      cursor: "pointer",
      transition: "border-color 0.15s, color 0.15s",
    }}>
      {label}
    </button>
  );
}

// ─── Screen 1 — Welcome ───────────────────────────────────────────────────────

function Screen1({ onNext, onSignIn }) {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      padding: "60px 16px 40px",
    }}>
      {/* Logo area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        {/* Hexagon with wrench */}
        <div style={{
          width: 80, height: 80,
          clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
          background: "rgba(79,195,247,0.1)",
          border: "1px solid rgba(79,195,247,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          <div style={{
            width: 80, height: 80,
            clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
            background: "rgba(79,195,247,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 32, fontWeight: 900,
            textTransform: "uppercase", letterSpacing: "-0.01em",
            color: "var(--text-primary)", lineHeight: 1,
          }}>
            SENIOR TECH
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13, color: "var(--text-secondary)",
            marginTop: 8, lineHeight: 1.5,
          }}>
            Your most experienced tech — in your pocket.
          </div>
        </div>

        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12, padding: "16px 20px",
          textAlign: "center", maxWidth: 300,
          marginTop: 8,
        }}>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13, color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}>
            AI-powered HVAC diagnostics built for field technicians.{" "}
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              Diagnose faster. Fix it right.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        <PrimaryBtn label="GET STARTED" onClick={onNext} icon={<ChevronRight size={16} />} />
        <button onClick={onSignIn} style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          fontSize: 13, color: "var(--blue)",
          padding: "8px 0",
        }}>
          Already have an account? <span style={{ fontWeight: 600 }}>Sign In</span>
        </button>
      </div>
    </div>
  );
}

// ─── Screen 2 — Create Account ────────────────────────────────────────────────

function Screen2({ draft, onNext }) {
  const [form, setForm] = useState({
    firstName:       draft.firstName       || "",
    lastName:        draft.lastName        || "",
    email:           draft.email           || "",
    password:        draft.password        || "",
    confirmPassword: draft.confirmPassword || "",
    company:         draft.company         || "",
  });
  const [touched, setTouched] = useState({});
  const [showPw,  setShowPw]  = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  function field(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setTouched(t => ({ ...t, [key]: true }));
  }

  const emailOk   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const pwOk      = form.password.length >= 8;
  const confirmOk = form.password === form.confirmPassword && form.confirmPassword.length > 0;

  const errors = {
    firstName:       touched.firstName       && !form.firstName.trim()  ? "Required" : "",
    lastName:        touched.lastName        && !form.lastName.trim()   ? "Required" : "",
    email:           touched.email           && !emailOk                ? "Enter a valid email address" : "",
    password:        touched.password        && !pwOk                   ? "Minimum 8 characters" : "",
    confirmPassword: touched.confirmPassword && !confirmOk              ? "Passwords do not match" : "",
  };

  const canContinue =
    form.firstName.trim() && form.lastName.trim() &&
    emailOk && pwOk && confirmOk;

  function handleNext() {
    if (!canContinue) return;
    onNext({ ...form });
  }

  return (
    <div style={{ padding: "0 16px 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 22, fontWeight: 900,
          textTransform: "uppercase", letterSpacing: "-0.01em",
          color: "var(--text-primary)", marginBottom: 4,
        }}>
          CREATE ACCOUNT
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
          Your account is personal to you. No sharing.
        </div>
      </div>

      <Input label="First Name"      required value={form.firstName}       onChange={v => field("firstName", v)}       error={errors.firstName}       success={touched.firstName && !errors.firstName && form.firstName.trim().length > 0} />
      <Input label="Last Name"       required value={form.lastName}        onChange={v => field("lastName", v)}        error={errors.lastName}        success={touched.lastName && !errors.lastName && form.lastName.trim().length > 0} />
      <Input label="Email Address"   required value={form.email}           onChange={v => field("email", v)}           error={errors.email}           success={touched.email && emailOk} placeholder="you@example.com" type="email" />
      <Input label="Password"        required value={form.password}        onChange={v => field("password", v)}        error={errors.password}        success={touched.password && pwOk}
        type={showPw ? "text" : "password"}
        placeholder="Minimum 8 characters"
        rightSlot={
          <button onClick={() => setShowPw(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
      <Input label="Confirm Password" required value={form.confirmPassword} onChange={v => field("confirmPassword", v)} error={errors.confirmPassword} success={touched.confirmPassword && confirmOk}
        type={showCpw ? "text" : "password"}
        placeholder="Re-enter password"
        rightSlot={
          <button onClick={() => setShowCpw(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}>
            {showCpw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
      <Input label="Company Name" value={form.company} onChange={v => field("company", v)} placeholder="Edge Mechanical LLC" />

      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <PrimaryBtn label="CONTINUE" onClick={handleNext} disabled={!canContinue} icon={<ChevronRight size={16} />} />
      </div>

      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 11, color: "var(--text-muted)",
        textAlign: "center", lineHeight: 1.6,
        padding: "0 8px",
      }}>
        By continuing you are providing your electronic signature to our Terms of Service pursuant to the Electronic Signatures in Global and National Commerce Act (15 U.S.C. § 7001 et seq.). Your electronic signature is the legal equivalent of your manual signature.
      </div>
    </div>
  );
}

// ─── Screen 3 — Professional Certification ────────────────────────────────────

function Screen3({ draft, onNext }) {
  const [epa,        setEpa]        = useState(draft.epa        || "");
  const [stateLic,   setStateLic]   = useState(draft.stateLicense || "");
  const [yearsRange, setYearsRange] = useState(draft.yearsRange || "");
  const [tradeFocus, setTradeFocus] = useState(draft.tradeFocus || []);

  function toggleTrade(t) {
    setTradeFocus(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  }

  const canContinue = epa.trim().length > 0 && yearsRange.length > 0;

  function handleNext() {
    if (!canContinue) return;
    onNext({ epa: epa.trim(), stateLicense: stateLic.trim(), yearsRange, tradeFocus });
  }

  const chipBase = {
    height: 44, padding: "0 16px",
    borderRadius: 8, border: "1px solid",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 13, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    cursor: "pointer", transition: "all 0.15s",
  };

  return (
    <div style={{ padding: "0 16px 32px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 22, fontWeight: 900,
          textTransform: "uppercase", letterSpacing: "-0.01em",
          color: "var(--text-primary)", marginBottom: 4,
        }}>
          VERIFY YOUR CREDENTIALS
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
          Senior Tech is for licensed HVAC professionals only.
        </div>
      </div>

      {/* Warning card */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: "2px solid var(--amber)",
        borderRadius: 10, padding: "12px 14px",
        marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <AlertTriangle size={16} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          This app involves guidance on high-voltage electrical systems and high-pressure refrigerant. Access is restricted to currently licensed and certified HVAC professionals.
        </div>
      </div>

      <Input
        label="EPA Section 608 Certification Number" required
        value={epa} onChange={setEpa}
        placeholder="Enter your EPA 608 cert number"
        helper="Your EPA 608 number is printed on your certification card"
        success={epa.trim().length > 3}
      />

      <Input
        label="State HVAC License Number" required
        value={stateLic} onChange={setStateLic}
        placeholder="Enter your state license number"
        helper="Enter N/A if your state does not require a separate HVAC license"
        success={stateLic.trim().length > 0}
      />

      {/* Years chips */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--text-secondary)", marginBottom: 10,
          display: "flex", gap: 4,
        }}>
          YEARS OF EXPERIENCE <span style={{ color: "var(--blue)" }}>*</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {YEAR_CHIPS.map(y => {
            const active = yearsRange === y;
            return (
              <button key={y} onClick={() => setYearsRange(y)} style={{
                ...chipBase,
                borderColor: active ? "var(--blue)" : "var(--border)",
                background:  active ? "var(--blue)" : "transparent",
                color:       active ? "#000" : "var(--text-secondary)",
              }}>
                {y}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trade focus chips */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--text-secondary)", marginBottom: 10,
        }}>
          PRIMARY TRADE FOCUS <span style={{ fontWeight: 400, fontSize: 10 }}>(OPTIONAL)</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TRADE_CHIPS.map(t => {
            const active = tradeFocus.includes(t);
            return (
              <button key={t} onClick={() => toggleTrade(t)} style={{
                ...chipBase,
                fontSize: 11,
                borderColor: active ? "var(--blue)" : "var(--border)",
                background:  active ? "rgba(79,195,247,0.12)" : "transparent",
                color:       active ? "var(--blue)" : "var(--text-muted)",
              }}>
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <PrimaryBtn label="CONTINUE" onClick={handleNext} disabled={!canContinue} icon={<ChevronRight size={16} />} />
      </div>

      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 11, color: "var(--text-muted)",
        lineHeight: 1.6, padding: "0 4px",
      }}>
        By providing this information you represent and warrant that your certifications and licenses are current, valid, and in good standing. Providing false information is a material breach of our Terms of Service and grounds for immediate account termination.
      </div>
    </div>
  );
}

// ─── Screen 4 — Terms & Acknowledgments ──────────────────────────────────────

function Screen4({ onNext }) {
  const [checks, setChecks] = useState(CHECKBOXES.map(() => false));
  const [showTerms, setShowTerms] = useState(false);
  const [saving, setSaving] = useState(false);

  const allChecked = checks.every(Boolean);

  function toggle(i) {
    setChecks(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  function selectAll() {
    setChecks(CHECKBOXES.map(() => true));
  }

  async function handleCreate() {
    if (!allChecked) return;
    setSaving(true);
    // Small delay for visual feedback
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onNext();
  }

  return (
    <div style={{ padding: "0 16px 32px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 22, fontWeight: 900,
          textTransform: "uppercase", letterSpacing: "-0.01em",
          color: "var(--text-primary)", marginBottom: 4,
        }}>
          REVIEW & ACKNOWLEDGE
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
          All acknowledgments are required. Read each carefully.
        </div>
      </div>

      {/* Terms summary */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 10, overflow: "hidden", marginBottom: 16,
      }}>
        <div style={{
          maxHeight: 160, overflowY: "auto",
          padding: "14px 14px 0",
          fontFamily: "'Inter', sans-serif",
          fontSize: 12, color: "var(--text-secondary)",
          lineHeight: 1.6, whiteSpace: "pre-line",
        }}>
          {TERMS_SUMMARY.substring(0, 900)}…
        </div>
        <div style={{ padding: "10px 14px 14px" }}>
          <button onClick={() => setShowTerms(true)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            color: "var(--blue)", padding: 0,
          }}>
            READ FULL TERMS →
          </button>
        </div>
      </div>

      {/* Select all */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={selectAll} style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          fontSize: 13, color: "var(--blue)", padding: 0,
        }}>
          Select All
        </button>
      </div>

      {/* Checkboxes */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 10, overflow: "hidden", marginBottom: 20,
      }}>
        {CHECKBOXES.map((item, i) => (
          <button
            key={item.key}
            onClick={() => toggle(i)}
            style={{
              width: "100%", minHeight: 72,
              display: "flex", gap: 12, alignItems: "flex-start",
              padding: "14px 14px",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: i < CHECKBOXES.length - 1 ? "1px solid var(--border)" : "none",
              textAlign: "left",
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 22, height: 22, flexShrink: 0, marginTop: 1,
              borderRadius: 5,
              border: `1.5px solid ${checks[i] ? "var(--blue)" : "var(--border)"}`,
              background: checks[i] ? "var(--blue)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
              transform: checks[i] ? "scale(1.08)" : "scale(1)",
            }}>
              {checks[i] && <Check size={13} color="#000" strokeWidth={3} />}
            </div>
            {/* Text */}
            <div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: checks[i] ? "var(--blue)" : "var(--text-secondary)",
                marginBottom: 4, transition: "color 0.15s",
              }}>
                {item.label}
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12, color: "var(--text-muted)",
                lineHeight: 1.55,
              }}>
                {item.text}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 0 }}>
        <PrimaryBtn
          label={saving ? "CREATING ACCOUNT…" : "CREATE MY ACCOUNT"}
          onClick={handleCreate}
          disabled={!allChecked || saving}
          icon={allChecked ? <Check size={16} /> : <Lock size={15} />}
        />
      </div>

      {/* Full terms modal */}
      {showTerms && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.85)", display: "flex",
          alignItems: "flex-end",
        }}>
          <div style={{
            background: "var(--bg-card)", width: "100%",
            maxHeight: "85vh", borderRadius: "16px 16px 0 0",
            border: "1px solid var(--border)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 16px 12px",
              borderBottom: "1px solid var(--border)",
            }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 16, fontWeight: 900,
                textTransform: "uppercase", letterSpacing: "0.05em",
                color: "var(--text-primary)",
              }}>
                TERMS OF SERVICE V1.2
              </div>
              <button onClick={() => setShowTerms(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 22, lineHeight: 1,
                padding: "4px 8px",
              }}>×</button>
            </div>
            <div style={{
              flex: 1, overflowY: "auto", padding: "16px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 13, color: "var(--text-secondary)",
              lineHeight: 1.7, whiteSpace: "pre-line",
            }}>
              {TERMS_SUMMARY}
            </div>
            <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
              <PrimaryBtn label="CLOSE" onClick={() => setShowTerms(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Screen 5 — Calibration & Welcome ────────────────────────────────────────

function Screen5({ yearsRange, firstName, onStart, onExplore }) {
  const exp = EXP_MAP[yearsRange] || EXP_MAP["4-7"];
  const msg = OPENING_MSG[exp.level];
  const desc = CALIBRATION_DESC[exp.level];

  return (
    <div style={{ padding: "0 16px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 26, fontWeight: 900,
          textTransform: "uppercase", letterSpacing: "-0.01em",
          color: "var(--text-primary)", marginBottom: 6,
        }}>
          SENIOR TECH IS READY
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
          Calibrated to your experience level.
        </div>
      </div>

      {/* Experience badge */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <div style={{
          background: `${exp.color}22`,
          border: `1.5px solid ${exp.color}`,
          borderRadius: 99, padding: "8px 20px",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 13, fontWeight: 900,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: exp.color,
          animation: "slideUp 0.25s ease-out",
        }}>
          {exp.badge}
        </div>
      </div>

      {/* Calibration description */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 13, color: "var(--text-secondary)",
        textAlign: "center", lineHeight: 1.6,
        marginBottom: 24, padding: "0 8px",
      }}>
        {desc}
      </div>

      {/* Senior Tech opening message */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: "2px solid var(--blue)",
        borderRadius: 10, padding: "14px 16px",
        marginBottom: 28, display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        {/* Hexagon avatar */}
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
          background: "rgba(79,195,247,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14, color: "var(--text-primary)",
          lineHeight: 1.6,
        }}>
          {msg}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <PrimaryBtn label="START DIAGNOSING" onClick={onStart} icon={<ChevronRight size={16} />} />
        <SecondaryBtn label="EXPLORE THE APP FIRST" onClick={onExplore} />
      </div>
    </div>
  );
}

// ─── Sign In screen ───────────────────────────────────────────────────────────

function SignInScreen({ onBack, onSignedIn }) {
  const [email, setEmail]   = useState("");
  const [pw,    setPw]      = useState("");
  const [error, setError]   = useState("");
  const [showPw, setShowPw] = useState(false);

  function handleSignIn() {
    // Check if this email matches the stored profile
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    const complete = localStorage.getItem(COMPLETE_KEY);
    if (complete && profile.email === email) {
      onSignedIn();
    } else if (complete) {
      // Different email but onboarding complete on this device — let them in
      onSignedIn();
    } else {
      setError("No account found on this device. Please create an account.");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column",
      padding: "60px 16px 40px",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 26, fontWeight: 900,
            textTransform: "uppercase",
            color: "var(--text-primary)", marginBottom: 4,
          }}>
            SIGN IN
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
            Welcome back.
          </div>
        </div>

        <Input label="Email Address" required value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
        <Input label="Password" required value={pw} onChange={setPw}
          type={showPw ? "text" : "password"}
          rightSlot={
            <button onClick={() => setShowPw(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        {error && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <PrimaryBtn label="SIGN IN" onClick={handleSignIn} disabled={!email || !pw} />
          <SecondaryBtn label="← BACK" onClick={onBack} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Onboarding component ────────────────────────────────────────────────

export default function Onboarding({ onComplete }) {
  const [step,     setStep]     = useState(() => {
    const draft = loadDraft();
    return draft.step || 1;
  });
  const [signIn,   setSignIn]   = useState(false);
  const [collectedData, setData] = useState(() => loadDraft());

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function advance(stepData) {
    const next = step + 1;
    const updated = { ...collectedData, ...stepData, step: next };
    setData(updated);
    saveDraft(updated);
    setStep(next);
  }

  function finishOnboarding() {
    completeOnboarding(collectedData);
    onComplete();
  }

  // Sign in path
  if (signIn) {
    return (
      <SignInScreen
        onBack={() => setSignIn(false)}
        onSignedIn={onComplete}
      />
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text-primary)",
    }}>
      {/* Step 1 has its own full-screen layout */}
      {step === 1 ? (
        <Screen1
          onNext={() => advance({})}
          onSignIn={() => setSignIn(true)}
        />
      ) : (
        <>
          <div style={{ paddingTop: 20, paddingBottom: 20 }}>
            <ProgressBar step={step} />
          </div>

          {step === 2 && (
            <Screen2
              draft={collectedData}
              onNext={data => advance(data)}
            />
          )}

          {step === 3 && (
            <Screen3
              draft={collectedData}
              onNext={data => advance(data)}
            />
          )}

          {step === 4 && (
            <Screen4
              onNext={() => advance({})}
            />
          )}

          {step === 5 && (
            <Screen5
              yearsRange={collectedData.yearsRange}
              firstName={collectedData.firstName}
              onStart={finishOnboarding}
              onExplore={finishOnboarding}
            />
          )}
        </>
      )}
    </div>
  );
}
