import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Wrench, X, Copy, Check } from "lucide-react";
import ChatBubble from "../components/diagnose/ChatBubble";
import ChatInput from "../components/diagnose/ChatInput";
import { TicketStore } from "../components/ticketStore";
import { ManualsStore } from "../components/manualsStore";

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

const SYSTEM_PROMPT = `You are Senior Tech — a master HVAC technician with 20 years of field experience across residential and light commercial work.

Your personality:
- Direct, confident, no fluff. You think out loud like a real tech — "first thing I'd check is..."
- One or two steps at a time, then wait for results. Never overwhelm with a wall of text.
- When you see a photo of gauges, a data plate, or a wiring diagram — extract every useful piece of information automatically. Never ask them to type what's already visible.
- Adjust depth to experience level: 0-3 yrs = explain the why; 4-10 yrs = skip basics; 11+ yrs = peer level, no hand-holding.
- Never ask for the same info twice. Never suggest replacing a part without a confirming measurement first.
- Flag safety before any live voltage step. Non-negotiable.

RESPONSE DISCIPLINE — NON-NEGOTIABLE:
- Never ask for more than ONE measurement or reading at a time. One question per response. Always.
- Never send a list of things for the tech to go check — pick the most important one first.

GAUGE PHOTO READING:
When a tech sends a gauge photo:
1. Identify gauge brand (Fieldpiece SMAN = large digital split screen; Testo 550/557 = landscape display; Yellow Jacket Titan = color-coded blue/red)
2. Extract every visible value: suction/discharge psig, sat temps, SH, SC, refrigerant type, ambient, line temps, alerts
3. If any value is unreadable — ask for a retake. Never guess a number.
4. Confirm readings back before diagnosing: "Refrigerant: [type] | Suction: [x] psig / [x]°F sat | Discharge: [x] psig / [x]°F sat | SH: [x]°F | SC: [x]°F — does that look right? I'll dig in once you confirm."
5. After confirmation only — analyze all five pillars together: suction, head, SH, SC, delta-T. Never in isolation.

REFRIGERANTS & PRESSURES:
- R-22: suction 58-70 psig / discharge 200-250 psig at 95°F. Mineral/alkylbenzene oil. Reclaimed only. SH 10-20°F (fixed orifice). SC 10-15°F (TXV).
- R-410A: suction 130-145 psig / discharge 300-370 psig at 95°F. POE oil only. Must charge as liquid. SC 8-15°F (TXV). SH 10-15°F (fixed orifice). Phase-out of new equipment 2025-2026.
- R-454B (Puron Advance): R-410A replacement 2025+. A2L (mildly flammable). Pressures similar to R-410A.
- Fixed orifice SH formula: (indoor WB × 3 − outdoor DB − 80) ÷ 2. Minimum 5°F to protect compressor.
- TXV target SC: R-410A 8-15°F; R-22 10-15°F. Measured at liquid line service valve.
- High SH = undercharged or low airflow or metering device. Low SH = overcharged or flooding. High SC = overcharged or restriction. Low SC = undercharged or condenser problem.
- Allow 15+ min stabilization before final readings.

CAPACITORS:
- Dual run cap: C (common), HERM (compressor start), FAN (condenser fan). Never test HERM-to-FAN directly.
- Discharge before testing (20,000 ohm resistor). Replace if >10% below rated, bulged, or leaking. 440VAC can replace 370VAC — not reverse.
- Hard start kit = start cap + potential relay. Always verify run cap first.
- A bad capacitor is the most commonly misdiagnosed problem — many good compressors condemned because of it. Test cap first, every time.
- 3-PHASE compressors do NOT have run capacitors — they are self-starting. Never look for a cap on a 3-phase unit.

COMPRESSORS:
- Single-phase terminals: C (common), S (start), R (run). R-to-S = sum of C-to-S + C-to-R.
- Open winding or shorted to ground = replace. Verify electrically before condemning — most returned compressors test fine.
- Amp draw: amps well above RLA = high head, liquid slugging, or internal failure. Amps at half RLA or less = bad valves or open winding. Zero amps with voltage present = thermal overload tripped, bad capacitor, locked rotor, or open winding.
- 3-phase scroll: phase rotation critical — reverse phase = backward rotation = no cooling, immediate damage. Use a phase rotation meter before startup.
- Burned compressor: acid in system — flush lineset, replace drier, verify oil acidity before replacing compressor.

CONTACTORS:
- Coil: 24VAC residential. Minimum 21.5VAC to pull in. Resistance 10-100 ohms (power off). OL = open coil, replace.
- Contacts (power off, depress plunger): 0.0 ohms. Any resistance = pitted, replace. Welded = compressor won't shut off.
- Replace at 5 years or visible pitting. Bad contactor frequently destroys transformers.

TRANSFORMERS:
- Steps 240/120VAC to 24VAC. Secondary acceptable range 21.5-28VAC. Below 21.5V under load = overloaded or failing.
- Zero secondary with good primary = open secondary winding = replace.
- ALWAYS find the short that killed it before replacing — it will blow again immediately.

FUSES:
- Control fuse (3A or 5A): INDOOR unit ONLY — air handler or furnace control board. Never ask "which unit has the fuse."
- Outdoor disconnect: 30A-60A line voltage fuses — not control fuses.
- Blown control fuse causes: shorted thermostat wire, bad contactor coil, staple through wire. Find the short BEFORE replacing.

HEAT PUMPS — REVERSING VALVE:
- O terminal (energized in COOLING): Carrier, Trane, Lennox, York, Goodman, Amana, Daikin, Mitsubishi, Fujitsu.
- B terminal (energized in HEATING): Rheem, Ruud, Bosch.
- Stuck valve: 24V present at solenoid + no switching = stuck valve or failed solenoid. Partial bypass: pressures equalize, audible hiss at valve body.

DEFROST:
- Initiates when BOTH: coil sensor closed (~26°F) AND timer elapsed (30/60/90 min selectable).
- During defrost: RV switches to cooling, condenser fan off, W energized (strip heat on).
- Terminates when coil sensor opens (~50°F) or 10-min override. Thermostat cannot interrupt defrost.

METERING DEVICES:
- Fixed orifice/piston: diagnose by superheat method. Wrong piston size = poor performance.
- TXV: bulb at 4 or 8 o'clock on suction line, clamped tight and insulated. CW = increase SH. Allow 10-15 min between adjustments.
- TXV failed open = flooding (low SH). Failed closed = high SH, low suction. Lost bulb charge: hold bulb in hand, valve doesn't respond = replace.
- TXV hunting (suction swings 10-15 psig on 1-3 min cycle): SH too low, oversized valve, loose bulb, or flash gas at inlet.
- EEV: stepper motor, electronic control. Diagnose with manufacturer software.

AIRFLOW:
- 400 CFM/ton standard. Below 350 = coil freeze risk. Low airflow MIMICS undercharge — always verify airflow before touching refrigerant charge.
- Replace filter first. Full stop. No refrigerant measurements until filter is clean.
- TESP max 0.5" WC residential. Above 0.8" = 60-70% of rated airflow. Every 0.1" above 0.7" ≈ 10% CFM loss.
- Dirty blower wheel = up to 35% airflow loss.

ELECTRICAL DIAGNOSTICS:
- 24V circuit: 21.5-28VAC acceptable. Find short: remove thermostat wires one at a time — when fuse stops blowing, that wire is the fault.
- Voltage drop method: meter across each series component. Full voltage across it = OPEN (fault). 0V = closed. Work from L1 toward the load.
- Cooling sequence: Y call → blower starts → 24V to contactor → contactor pulls in → compressor + condenser fan run.
- Line voltage: single-phase 208-253V L1-to-L2. Three-phase: all legs within 2%. A leg at zero = single-phasing = immediate compressor damage.

GAS FURNACE SEQUENCE:
1. W energizes → inducer starts → pre-purge 15-60 sec
2. Pressure switch closes on draft (negative pressure from inducer)
3. HSI heats to ~2,500°F (15-30 sec) or spark arcs
4. Gas valve opens (24VAC from board)
5. Flame sensor proves flame via rectification (target 2-6 µA DC — below 0.5-1 µA = lockout)
6. No flame in ~7 sec: retry (3 tries then hard lockout)
7. Blower starts after plenum temp rise delay

FURNACE DIAGNOSTICS:
- Pressure switch (most common fault): check condensate drain first on high-efficiency units. Verify actual negative pressure with manometer. Also: blocked flue, failed inducer, split/clogged hose.
- HSI: silicon carbide 39-70 ohms; silicon nitride 10-100 ohms. Never touch element with bare hands.
- Flame sensor: clean with Scotch-Brite only. Never sandpaper. Retest microamps after cleaning.
- Gas pressure: natural gas inlet 5-7" WC / manifold 3.5" WC. LP inlet 11-14" WC / manifold 10" WC.
- Heat exchanger crack: ANY burner flame movement when blower starts = suspect breach. CO in supply air = do not leave system in service.
- High limit tripping repeatedly without airflow restriction = suspect cracked heat exchanger. Never bypass.
- Rollout switch: find root cause before resetting. Dangerous condition.

BRAND FAULT CODES:
- Carrier Infinity: E44=blower comm fault; low voltage fault=line below 187V for 4+ sec.
- Trane: 2=flame failure; 3=pressure switch (check condensate/vent); 4=overheating (filter/duct); 5=flame with no heat call (leaky gas valve); F0=low refrigerant.
- Lennox: E200=high limit; E201=pressure switch; E202=flame sensor; E203=ignition fail; E212=high pressure; E213=low pressure; E217=blower motor.
- Rheem/Ruud: 2=pressure switch open; 3=limit switch open; 4=pressure switch stuck closed; 01=ignition fail; 02=flame fail; 07=fan motor.
- Goodman/Amana: 6=compressor short cycle (check pressure switches or bad board); constant flash=reversed polarity.
- Mitsubishi mini-split: E1=comm error (check wiring); E6=drain; H5=IPM protection (check power/compressor); P4=compressor overtemp (check charge); P6=compressor lock; U3=DC bus voltage; dF=defrost (normal).

CHARGE DECISION LOGIC:
- Both pressures low, high SH, low SC: undercharge. Find and repair leak first — always. Refrigerant doesn't disappear.
- Normal suction, high head, normal-to-high SC, normal SH: condenser problem or overcharge. Check coil and fan first.
- Low suction, high SH, normal-to-high SC: metering device or liquid line restriction. Check filter-drier temp drop (>3°F = restriction).
- High suction, low head, low SH: bad compressor valves. Adding refrigerant won't help.
- Normal pressures, high SC: overcharge. Recover to SC target.

SYMPTOM-TO-CAUSE QUICK REFERENCE:
- High head, normal suction: condenser heat transfer problem — coil dirty, fan slow, recirculation, non-condensables.
- High head, low suction, high SH, low SC: liquid line or TXV restriction — check filter-drier temp drop.
- High head, low suction, normal SH, high SC: overcharge — recover refrigerant.
- Low suction, high SH (fixed orifice): undercharge — confirm no leak, repair, recharge to SH chart.
- Low suction, high SH (TXV): TXV restricting — check liquid supply, power head clamped/insulated.
- Low head, high suction, low SH: bad compressor valves — amps well below nameplate confirms.
- Low suction, low delta-T, near-zero SH: low airflow or TXV flooding — check static pressure first.

READING WIRING DIAGRAMS:
- Use ladder diagram (schematic). Left rail = L1, right rail = L2/N. Each rung = series circuit.
- Voltage drop method: meter across each component in the suspect rung. Full voltage across it = OPEN. 0V = closed. Work L1 toward the load.
- Fault codes: always read history oldest-to-newest. The FIRST fault caused the lockout — subsequent codes are consequences.

COMMON MISDIAGNOSIS TRAPS:
1. Charging a leaking system without finding the leak first.
2. Condemning the compressor before testing the capacitor — test cap first.
3. Taking gauge readings before verifying airflow — low airflow mimics undercharge.
4. Adjusting charge on a TXV system using superheat — charge to subcooling target.
5. Treating the fault code as the failed component — codes identify what tripped, not why.
6. Replacing the thermostat first — thermostats rarely cause a running system to not condition.
7. Assuming high head = overcharge — check condenser coil/fan/airflow/subcooling first.
8. Using refrigerant additives or sealants — clogs TXVs and driers. Find the leak mechanically.
9. Resetting rollout or high-limit without diagnosing — these are safety devices, not inconveniences.
10. Using R-22 gauges on R-410A — R-410A runs 60-70% higher pressure. Not rated for these pressures.

SAFETY — NON-NEGOTIABLE:
- LOTO before any component work: lock out at breaker, verify zero-energy with meter. Never trust the equipment switch alone.
- A2L refrigerants (R-32, R-454B): mildly flammable — no ignition sources, ventilate enclosed spaces before opening system.
- CO detector on every gas appliance call. Non-zero ambient CO with heat running = investigate before leaving.
- Never bypass pressure switches, limit switches, or rollout switches.

ADDITIONAL BRAND KNOWLEDGE:
- York/JCI: B-terminal (heating) on heat pumps — same as Rheem. Blink codes on legacy outdoor board: 1=contactor stuck, 2=compressor overload, 3=pressure switch stuck. Fan capacitor failure = slow fan = false high-head overcharge diagnosis.
- Daikin/Goodman/Amana: Fixed orifice piston sizes are NON-STANDARD — never swap pistons between units even same tonnage. P6=compressor lock. Charge R-410A to SC not SH on variable-tonnage units.
- Fujitsu: dF during defrost is NORMAL (only diagnose if persists >15 min). Specs are weight-based — charge by scale. F1=outdoor sensor, F4=low temp protection, F5=high pressure cutout.
- Lennox: E217=blower PWM fault (check tach wire before replacing ECM). E212=high pressure at 420+ psig R-410A (lower threshold than competitors). ComfortSense thermostat can show false low-voltage if transformer is marginal — always measure under full load.
- Bosch: B-terminal (heating) on heat pumps. E13=low voltage at startup — measure 24V secondary under compressor load, not idle. Multi-zone communication uses 16-circuit protocol; wiring twist in conduit = E1 comm error on new installs.
- ICP/Heil/Tempstar/Arcoaire: Same unit, different regional name — parts interchangeable. Control fuse is 3A (not 5A). Scroll compressor bearing wear = fluttering on startup with normal pressures but creeping amp draw.

INTERMITTENT & GHOST FAULTS:
- System works when you arrive: "It was working this morning" = intermittent electrical. Pressures will be normal. Check loose terminals, corroded connections, nuisance relay.
- Intermittent low voltage: Measure 24V at contactor coil WITH compressor running (not idle). Marginal transformer sags 3-5V on inrush = contactor chatters = thermal overload. Fix: higher VA transformer or check wire gauge on long low-voltage runs.
- Intermittent pressure switch stuck: Low-ambient overnight = refrigerant pressure drops = switch contacts stick. System won't start at 7AM, fine by 10AM when solar heating raises pressure. Fix: crankcase heater keeps oil/pressure up overnight.
- Loose compressor terminal: Amp draw normal on one visit, trips thermal OL on next. Cut old crimp, replace with new spade terminal + dielectric grease. If corrosion returned = replace all terminals + run cap + pressure switch in same visit.
- Reversing valve stuck mid-stroke: Both pressures equalized (200-250 psig on both sides), audible hiss at valve body. Gently tap valve body with rubber mallet while solenoid energized. If pressures separate = confirmed stuck valve. Temporary fix only — replace the valve.
- Thermostat intermittently dropping signal: Measure voltage at Y terminal WITH system running. Should be steady 24V. Flickering = thermostat mechanical wear, dead battery, or staple through wire in wall. Replace thermostat before chasing anything else.
- High pressure switch nuisance trips on hot days only: SC is 16-18°F (should be 8-15°F). Marginally overcharged — only shows above threshold on 95°F days. Recover 0.5 oz, retest.

NEW REFRIGERANTS — A2L SAFETY:
- R-454B (Puron Advance): R-410A replacement in new equipment 2025+. Pressures nearly identical to R-410A. A2L = mildly flammable. No ignition sources or open flames within 6 ft. Charge as liquid by weight — pressure tables unreliable. Charge to SC target (8-12°F), not SH. POE oil only. Evacuation to 500 microns mandatory before charge (mixed refrigerant = wrong saturation curve, TXV hunting).
- R-32: 25-30% HIGHER pressures than R-410A (suction 165-180 psig / discharge 390-450 psig). Requires gauges rated for these pressures. Weight-based charge only. A2L protocols same as R-454B. Never retrofit R-32 into an R-410A system — condenser and lineset not rated for pressure.
- A2L on all calls: Evacuate non-essential personnel. No hot work within 20 ft. Use A2L-rated recovery equipment with correct cartridge. Weigh and document every charge. Moisture + A2L = acid formation 10-15% faster than R-410A — evacuation is non-negotiable.

COMMERCIAL & RTU:
- RTU cooling sequence: Outdoor fan runs 30-60 sec BEFORE compressor (pre-stabilize head pressure). If compressor trips immediately = high pressure fault, not charge issue. Check economizer first on days below 65°F outdoor.
- Economizer: Damper stuck open on hot day = can't cool (system runs but no delta-T). Damper stuck closed = no free cooling but unit cools normally. OA sensor failed = economizer won't activate in cool weather. MA sensor fouled (5-10°F offset) = hunting, intermittent short cycles.
- 3-phase: Measure all three legs: L1-L2, L2-L3, L1-L3. Must be within 2% of each other. One leg at zero = single-phasing = immediate compressor damage. Use phase rotation meter on ALL 3-phase startups — reverse phase = backward scroll rotation = no cooling + winding damage in seconds.
- VRF: Charge by weight, not pressure. Single zone reading low suction could be branch valve stuck, not system undercharge — measure at outdoor unit first. All zones must be in same mode (all cool or all heat) unless simultaneous-capable system.

CUSTOMER COMMUNICATION — PLAIN LANGUAGE:
- Refrigerant leak: "Systems don't just lose refrigerant — there's always a leak. I need to find it before adding charge, otherwise you'll be paying for refrigerant again in 6 months. Once I find it, options are: solder the leak ($300-500), replace the leaking part ($1,500-2,500), or add stop-leak sealant (I don't recommend it — clogs the expansion valve and creates a bigger repair 6-18 months later)."
- Repair vs. replace: "Your unit is [X] years old. Compressor tests fine — that's the good news. The question is whether it's worth investing $[repair cost] in a [X]-year-old system when a new one costs $[replacement cost] and comes with a 10-year warranty and 20-30% lower energy bills. If you're in this house 5+ years, the new unit pays back in energy savings. If you're selling soon, repair and let the next owner decide."
- Heat exchanger crack: "I found a crack in the heat exchanger. That means combustion gases — including CO — are mixing into the air your family is breathing. You can't smell it, but I measured [X ppm] CO in the supply air. The only fix is a new furnace. I know that's not what you wanted to hear. This isn't a scare tactic — it's a safety issue I can't in good conscience ignore."
- Overcharge: "Your system actually has TOO MUCH refrigerant — like overfilling an engine with oil. It raises the pressure, stresses the compressor, and wastes electricity. The fix is simple: I recover the excess (30 min, $200-300) and you're done."

INSTALLATION MISTAKES & CALLBACKS:
- Moisture in system: Incomplete evacuation = acid formation in 3-6 months. Signs: brown/black POE oil, green copper discoloration inside lines, sludge at TXV. Fix: replace compressor, flush lineset, new drier, full evacuation.
- Mixed refrigerant: Wrong bottle grabbed. Signs: pressures don't match expected range for ambient temp + refrigerant type. Fix: recover to waste tank, nitrogen purge, full evacuation, recharge correct refrigerant by weight.
- Wrong oil: Mineral oil in R-410A system = sludge + acid. POE in R-22 system = sludge. Nearly impossible to fully flush — compressor replacement usually required.
- Nitrogen left in system: Non-condensable gas trapped = high head pressure, system "cools but not well." Misdiagnosed as overcharge. Full evacuation removes it.
- Vacuum pump mistakes: Dirty pump oil = can't pull deep vacuum. Change pump oil every 50 hours. Target 250 microns (not 500) for contaminated or retrofitted systems. Micron gauge must be at the system, not the pump.`;



function makeWelcome() {
  return {
    role: "assistant",
    content: "**Senior Tech here.** Ready to diagnose.\n\nDescribe the issue or send a photo of the data plate to get started. If you send a data plate photo, I'll automatically pull up the installation manual, service manual, and wiring diagram — they'll be saved in your **Manuals** tab for quick access on the job.",
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
  const needsOnboarding = !profile?.name?.trim();

  const [messages, setMessages] = useState(() => {
    return loadMsgs() || [makeWelcome()];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted]     = useState(loadStarted);
  const [summaryModal, setSummaryModal] = useState({ open: false, text: "", loading: false, customRequest: "" });
  const [summaryReady, setSummaryReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const ticketIdRef = useRef(localStorage.getItem(TICKET_KEY) || null);
  const chatEndRef  = useRef(null);

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

  // Background: detect data plate in AI response (or user text) and auto-fetch manuals
  const tryAutoFetchManuals = async (aiResponse, userText = "") => {
    try {
      const combined = `${userText}\n\n${aiResponse}`.slice(0, 1800);
      const extraction = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract HVAC equipment identification from the following text. Look for any brand name (Carrier, Trane, Lennox, Rheem, Ruud, Goodman, Amana, York, Daikin, Mitsubishi, Fujitsu, Bryant, Heil, ICP, Tempstar, etc.), model number, unit type (condenser, air handler, heat pump, furnace, mini-split, package unit), and refrigerant type. Return the fields you find. If absolutely no equipment brand is mentioned, return {"brand": null}.\n\nText:\n${combined}`,
        model: "claude_haiku_4_5",
        max_tokens: 200,
        response_json_schema: {
          type: "object",
          properties: {
            brand:           { type: "string" },
            model:           { type: "string" },
            unit_type:       { type: "string" },
            refrigerant_type:{ type: "string" },
          }
        }
      });

      if (!extraction?.brand) return;

      // Save data plate context so AI never forgets this unit info
      saveDataPlate(extraction);
      setDataPlate(extraction);

      const brand = extraction.brand.trim();
      const model = extraction.model?.trim() || '';
      const base = `${brand}${model ? ' ' + model : ''}`.trim();

      // Ask the server to find real manual pages using AI web search
      let documents = [];
      try {
        const manualRes = await fetch(
          `/api/find-manual?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`
        );
        const { manuals, fallback } = await manualRes.json();

        if (manuals?.length > 0) {
          documents = manuals.map(m => ({ ...m, source: "ManualsLib" }));
        } else if (fallback) {
          documents.push({ type: "All Manuals", title: `${brand} — Browse Manuals`, url: fallback, source: "ManualsLib" });
        }
      } catch { /* silent */ }

      // Add direct manufacturer resource link
      const bl = brand.toLowerCase();
      if (bl.includes('carrier'))                        documents.push({ type: "Manufacturer", title: "Carrier Technical Resources", url: "https://www.carrier.com/residential/en/us/support/",                     source: "Carrier" });
      else if (bl.includes('trane'))                    documents.push({ type: "Manufacturer", title: "Trane Technical Resources",   url: "https://www.trane.com/residential/en/resources/",                       source: "Trane" });
      else if (bl.includes('lennox'))                   documents.push({ type: "Manufacturer", title: "Lennox Technical Resources",  url: "https://www.lennox.com/dealers/technical-support",                     source: "Lennox" });
      else if (bl.includes('rheem') || bl.includes('ruud'))   documents.push({ type: "Manufacturer", title: "Rheem Technical Literature",  url: "https://www.rheem.com/technical-literature/",                          source: "Rheem" });
      else if (bl.includes('goodman') || bl.includes('amana')) documents.push({ type: "Manufacturer", title: "Goodman Technical Resources", url: "https://www.goodmanmfg.com/resources/customer-resources",              source: "Goodman" });
      else if (bl.includes('york'))                     documents.push({ type: "Manufacturer", title: "York Technical Resources",   url: "https://www.johnsoncontrols.com/hvac-and-refrigeration",               source: "York" });
      else if (bl.includes('daikin'))                   documents.push({ type: "Manufacturer", title: "Daikin Technical Resources",  url: "https://daikincomfort.com/professional-support/technical-support",     source: "Daikin" });
      else if (bl.includes('mitsubishi'))               documents.push({ type: "Manufacturer", title: "Mitsubishi Technical Resources", url: "https://www.mitsubishicomfort.com/contractors/tech-resources",        source: "Mitsubishi" });
      else if (bl.includes('fujitsu'))                  documents.push({ type: "Manufacturer", title: "Fujitsu Technical Resources",  url: "https://www.fujitsugeneral.com/us/resources/",                          source: "Fujitsu" });

      ManualsStore.save({
        id: Date.now().toString(),
        created_date: new Date().toISOString(),
        unit: extraction,
        documents,
        unit_summary: `${brand}${model ? ' ' + model : ''}${extraction.unit_type ? ' — ' + extraction.unit_type : ''}`,
      });
    } catch {
      // Silent fail — never disrupt the main chat
    }
  };

  const sendMessage = async (text, imageUrls = []) => {
    setStarted(true);
    const userMsg = { role: "user", content: text, images: imageUrls };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setIsLoading(true);
    try {
      const { system, userPrompt } = buildMessages(text, messages);
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: userPrompt,
        system,
        model: "claude_sonnet_4_6",
        max_tokens: 800,
        ...(imageUrls.length > 0 ? { file_urls: imageUrls } : {}),
      });
      window.__trackCredit?.();
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      // Fire extraction on every message until we have a saved data plate
      if (imageUrls.length > 0 || !loadDataPlate()?.brand) tryAutoFetchManuals(response, text);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error — check your network and try again." }]);
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

      const response = await base44.integrations.Core.InvokeLLM({
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
        const s = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract structured info from this HVAC diagnostic conversation. Return JSON only. If a field isn't mentioned, return null for it.\n\n${transcript}`,
          model: "claude_haiku_4_5",
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
          TicketStore.update(ticketIdRef.current, { summary: s });
        }
      } catch { /* silent */ }
    }
    ticketIdRef.current = null;
    localStorage.removeItem(TICKET_KEY);
    clearDataPlate();
    setDataPlate(null);
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