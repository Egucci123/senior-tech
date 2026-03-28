import React, { useState } from "react";
import { Thermometer, Contrast, Globe, RefreshCw, ChevronRight } from "lucide-react";
import { TicketStore } from "../components/ticketStore";
import { ManualsStore } from "../components/manualsStore";

const DEFAULT_PROFILE = {
  name: "Field Tech",
  title: "HVAC TECHNICIAN",
  company: "",
  years: "5",
  temp_unit: "F",
};

function loadProfile() {
  try { return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem("senior_tech_profile") || "{}") }; }
  catch { return { ...DEFAULT_PROFILE }; }
}
function saveProfile(p) {
  localStorage.setItem("senior_tech_profile", JSON.stringify(p));
}

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 99,
        background: on ? "var(--blue)" : "var(--bg-elevated)",
        border: `1px solid ${on ? "var(--blue)" : "var(--border)"}`,
        position: "relative", cursor: "pointer", flexShrink: 0,
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <div style={{
        position: "absolute",
        top: 3, left: on ? "calc(100% - 19px)" : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: on ? "#0f0f0f" : "var(--text-muted)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

function RowDivider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 0 0 0" }} />;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState(loadProfile);
  const [saved, setSaved]     = useState(false);
  const [editing, setEditing] = useState(null); // 'name' | 'years' | 'title' | 'company'

  const update = (key, value) => {
    const next = { ...profile, [key]: value };
    setProfile(next);
    saveProfile(next);
  };

  const handleClearCache = () => {
    if (confirm("Wipe all saved jobs and manuals? This cannot be undone.")) {
      localStorage.removeItem("diag_tickets");
      localStorage.removeItem("saved_manuals");
      localStorage.removeItem("diag_messages_v2");
      localStorage.removeItem("diag_started_v2");
      localStorage.removeItem("diag_current_ticket_id");
    }
  };

  const initials = profile.name
    ? profile.name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "ST";

  const yearsLabel = (y) => {
    const n = parseInt(y, 10);
    if (isNaN(n)) return "—";
    return `${n} YR${n !== 1 ? "S" : ""} EXPERIENCE`;
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Profile Card */}
      <div style={{
        margin: "16px 16px 0",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: "4px solid var(--blue)",
        borderRadius: 8, padding: "20px 16px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, right: 0, padding: 12, opacity: 0.06,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 80, fontWeight: 900, color: "var(--blue)", lineHeight: 1,
          userSelect: "none",
        }}>TECH</div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="hexagon" style={{
            width: 72, height: 72, flexShrink: 0,
            background: "var(--blue)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 18px rgba(79,195,247,0.3)",
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 28, fontWeight: 900, color: "#0f0f0f",
            }}>{initials}</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editing === "name" ? (
              <input
                autoFocus
                value={profile.name}
                onChange={e => update("name", e.target.value)}
                onBlur={() => setEditing(null)}
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 24, fontWeight: 900, color: "var(--text-primary)",
                  textTransform: "uppercase", background: "transparent",
                  border: "none", borderBottom: "1px solid var(--blue)",
                  outline: "none", width: "100%",
                }}
              />
            ) : (
              <button onClick={() => setEditing("name")} style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 24, fontWeight: 900, color: "var(--text-primary)",
                textTransform: "uppercase", background: "none", border: "none",
                cursor: "pointer", textAlign: "left", padding: 0, letterSpacing: "0.02em",
              }}>
                {profile.name || "TAP TO SET NAME"}
              </button>
            )}

            {editing === "title" ? (
              <input
                autoFocus
                value={profile.title}
                onChange={e => update("title", e.target.value.toUpperCase())}
                onBlur={() => setEditing(null)}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12, color: "var(--text-secondary)",
                  background: "transparent", border: "none",
                  borderBottom: "1px solid var(--border)", outline: "none", width: "100%",
                  marginTop: 4,
                }}
              />
            ) : (
              <button onClick={() => setEditing("title")} style={{
                display: "block", fontFamily: "'Inter', sans-serif",
                fontSize: 12, color: "var(--text-secondary)", background: "none",
                border: "none", cursor: "pointer", padding: 0, marginTop: 4,
              }}>
                {profile.title || "TAP TO SET TITLE"}{profile.company ? ` | ${profile.company}` : ""}
              </button>
            )}

            <button
              onClick={() => setEditing("years")}
              style={{
                marginTop: 10,
                display: "inline-flex", alignItems: "center",
                padding: "4px 12px", borderRadius: 99,
                border: "1px solid var(--blue)", background: "transparent",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 700, color: "var(--blue)",
                textTransform: "uppercase", letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              {yearsLabel(profile.years)}
            </button>
          </div>
        </div>

        {editing === "years" && (
          <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              YEARS IN TRADE:
            </span>
            <input
              autoFocus
              type="number" min="0" max="50"
              value={profile.years}
              onChange={e => update("years", e.target.value)}
              onBlur={() => setEditing(null)}
              style={{
                width: 60, background: "var(--bg)", color: "var(--text-primary)",
                border: "1px solid var(--blue)", borderRadius: 6,
                padding: "6px 10px", fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 16, fontWeight: 700, outline: "none", textAlign: "center",
              }}
            />
          </div>
        )}
      </div>

      {/* Zone 01 */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)" }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.18em",
          }}>
            ZONE_01: SYSTEM_PREFERENCES
          </span>
        </div>

        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6,
          overflow: "hidden",
        }}>
          {/* Temp unit */}
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 14 }}>
            <Thermometer size={20} color="var(--text-muted)" strokeWidth={1.5} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 14, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.04em", color: "var(--text-primary)",
              }}>
                Temperature Unit
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase",
                letterSpacing: "0.08em", marginTop: 2,
              }}>
                CURRENT: {profile.temp_unit === "C" ? "CELSIUS (°C)" : "FAHRENHEIT (°F)"}
              </div>
            </div>
            <button
              onClick={() => update("temp_unit", profile.temp_unit === "F" ? "C" : "F")}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12, fontWeight: 700, color: "var(--blue)",
                background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em",
              }}
            >
              {profile.temp_unit === "F" ? "°F ↔ °C" : "°C ↔ °F"}
            </button>
          </div>
          <RowDivider />

          {/* Experience level */}
          <button
            onClick={() => setEditing("years")}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              padding: "14px 16px", gap: 14, background: "none", border: "none", cursor: "pointer",
            }}
          >
            <Contrast size={20} color="var(--text-muted)" strokeWidth={1.5} />
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 14, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.04em", color: "var(--text-primary)",
              }}>
                Senior Tech Experience Level
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase",
                letterSpacing: "0.08em", marginTop: 2,
              }}>
                {profile.years ? `${profile.years} YRS — DRIVES AI RESPONSE DEPTH` : "TAP TO SET"}
              </div>
            </div>
            <ChevronRight size={16} color="var(--blue)" />
          </button>
          <RowDivider />

          {/* Company */}
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 14 }}>
            <Globe size={20} color="var(--text-muted)" strokeWidth={1.5} />
            <div style={{ flex: 1 }}>
              {editing === "company" ? (
                <input
                  autoFocus
                  value={profile.company}
                  placeholder="Company name..."
                  onChange={e => update("company", e.target.value)}
                  onBlur={() => setEditing(null)}
                  style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--text-primary)",
                    background: "transparent", border: "none", outline: "none", width: "100%",
                    borderBottom: "1px solid var(--blue)",
                  }}
                />
              ) : (
                <button onClick={() => setEditing("company")} style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 14, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.04em", color: "var(--text-primary)",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                }}>
                  {profile.company || "TAP TO ADD COMPANY"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zone 02 */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)" }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.18em",
          }}>
            ZONE_02: DATA_MANAGEMENT
          </span>
        </div>

        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6,
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", padding: "14px 16px", gap: 14,
          }}>
            <RefreshCw size={20} color="var(--text-muted)" strokeWidth={1.5} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 14, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.04em", color: "var(--text-primary)",
              }}>
                Clear Diagnostic Cache
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase",
                letterSpacing: "0.08em", marginTop: 2,
              }}>
                WIPES ALL SAVED JOBS AND MANUALS
              </div>
            </div>
            <button onClick={handleClearCache} style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12, fontWeight: 900, color: "var(--red)",
              borderBottom: "1px solid rgba(244,67,54,0.3)",
              background: "none", border: "none", cursor: "pointer", letterSpacing: "0.08em",
            }}>
              WIPE
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 48, textAlign: "center",
        opacity: 0.3,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 10, fontWeight: 700, color: "var(--text-secondary)",
        textTransform: "uppercase", letterSpacing: "0.18em", lineHeight: 1.8,
      }}>
        <div>FIRMWARE V.1.0.0</div>
        <div>MACHINED BY SENIOR TECH</div>
      </div>
    </div>
  );
}
