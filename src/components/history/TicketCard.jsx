import React, { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, AlertTriangle, Zap, Settings, Wrench } from "lucide-react";
import { TicketStore } from "../ticketStore";

const STATUS_MAP = {
  resolved:    { label: "COMPLETE",    color: "var(--green)" },
  follow_up:   { label: "FOLLOW UP",   color: "var(--amber)" },
  safety_flag: { label: "SAFETY",      color: "var(--red)" },
  in_progress: { label: "IN PROGRESS", color: "var(--blue)", pulse: true },
};

function faultIcon(code, color) {
  const c = (code || "").toLowerCase();
  if (c.includes("compressor") || c.includes("cap")) return <Zap size={13} color={color} />;
  if (c.includes("pressure") || c.includes("lock")) return <AlertTriangle size={13} color={color} />;
  if (c.includes("elec") || c.includes("voltage")) return <Zap size={13} color={color} />;
  if (c.includes("control") || c.includes("board")) return <Settings size={13} color={color} />;
  return <Wrench size={13} color={color} />;
}

const STATUS_OPTIONS = ["in_progress", "resolved", "follow_up", "safety_flag"];
const STATUS_LABELS  = { resolved:"COMPLETE", follow_up:"FOLLOW UP", safety_flag:"SAFETY FLAG", in_progress:"IN PROGRESS" };

export default function TicketCard({ ticket, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes]       = useState(ticket.notes || "");
  const [status, setStatus]     = useState(ticket.status || "in_progress");

  const summary  = ticket.summary || {};
  const brand    = summary.brand || "";
  const model    = summary.model || "";
  const serial   = summary.serial || "";
  const fault    = summary.fault_code || "";

  // Build display unit name from summary or fall back to first user message
  const unitName = (() => {
    if (brand || model) return [brand, model].filter(Boolean).join(" ").toUpperCase();
    const first = (ticket.messages || []).find(m => m.role === "user");
    return first ? first.content.slice(0, 40).toUpperCase() : "DIAGNOSTIC SESSION";
  })();

  const st = STATUS_MAP[status] || STATUS_MAP.in_progress;
  const dateStr = format(new Date(ticket.created_date), "MMM d, yyyy | HH:mm").toUpperCase();

  const saveNotes = () => {
    TicketStore.update(ticket.id, { notes });
    if (onUpdate) onUpdate();
  };

  const updateStatus = (s) => {
    setStatus(s);
    TicketStore.update(ticket.id, { status: s });
    if (onUpdate) onUpdate();
  };

  const faultColor = {
    resolved: "var(--text-muted)", follow_up: "var(--amber)",
    safety_flag: "var(--red)", in_progress: "var(--blue)",
  }[status] || "var(--blue)";

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 8, overflow: "hidden",
    }}>
      {/* Main card face */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", padding: "14px 16px", background: "transparent",
          border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        {/* Top row: date + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.12em",
          }}>
            {dateStr}
          </span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
            color: st.color,
            background: st.color + "15",
            border: `1px solid ${st.color}30`,
            padding: "2px 8px", borderRadius: 4,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {st.pulse && (
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: st.color, display: "inline-block",
                animation: "pulseBadge 2s ease-in-out infinite",
              }} />
            )}
            {st.label}
          </span>
        </div>

        {/* Unit name */}
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 22, fontWeight: 900, color: "var(--text-primary)",
          textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1.1,
          marginBottom: 2,
        }}>
          {unitName}
        </div>

        {/* Serial */}
        {serial && (
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10,
          }}>
            SN: {serial}
          </div>
        )}

        {/* Fault tag */}
        {fault ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "var(--bg)", padding: "7px 12px",
            borderRadius: 4, borderLeft: `2px solid ${faultColor}`,
          }}>
            {faultIcon(fault, faultColor)}
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10, fontWeight: 700, color: faultColor,
              textTransform: "uppercase", letterSpacing: "0.14em",
            }}>
              {fault.replace(/\s+/g, "_")}
            </span>
          </div>
        ) : (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "var(--bg)", padding: "7px 12px",
            borderRadius: 4, borderLeft: "2px solid var(--border)",
          }}>
            <Wrench size={13} color="var(--text-muted)" />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.14em",
            }}>
              DIAGNOSTIC_SESSION
            </span>
          </div>
        )}

        <div style={{ float: "right", marginTop: -16 }}>
          {expanded
            ? <ChevronUp size={14} color="var(--text-muted)" />
            : <ChevronDown size={14} color="var(--text-muted)" />}
        </div>
      </button>

      {/* Expanded: conversation + notes + status */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px" }}>

          {/* Conversation */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8,
          }}>
            CONVERSATION
          </div>
          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            maxHeight: 260, overflowY: "auto", marginBottom: 14,
          }}>
            {(ticket.messages || []).map((m, i) => (
              <div key={i} style={{
                padding: "7px 10px", borderRadius: 4,
                background: m.role === "user" ? "rgba(79,195,247,0.07)" : "var(--bg-elevated)",
                borderLeft: `2px solid ${m.role === "user" ? "var(--blue)" : "var(--border)"}`,
              }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9, letterSpacing: "0.12em", marginBottom: 2,
                  color: m.role === "user" ? "var(--blue)" : "var(--text-muted)",
                  textTransform: "uppercase",
                }}>
                  {m.role === "user" ? "TECH" : "SENIOR TECH"}
                </div>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5, margin: 0,
                  whiteSpace: "pre-wrap",
                }}>
                  {m.content}
                </p>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6,
          }}>
            FIELD NOTES
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add field notes..."
            rows={2}
            style={{
              width: "100%", resize: "none", boxSizing: "border-box",
              background: "var(--bg)", color: "var(--text-primary)",
              border: "1px solid var(--border)", borderRadius: 6,
              padding: "10px 12px", marginBottom: 6,
              fontFamily: "'Inter', sans-serif", fontSize: 13, outline: "none",
            }}
            onFocus={e => { e.target.style.borderColor = "var(--blue)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
          />
          <button onClick={saveNotes} className="btn-press" style={{
            padding: "8px 16px", borderRadius: 6,
            background: "var(--blue)", color: "#0f0f0f", border: "none",
            cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", marginBottom: 14,
          }}>
            SAVE NOTES
          </button>

          {/* Status */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8,
          }}>
            STATUS
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => updateStatus(s)} className="btn-press" style={{
                padding: "7px 13px", borderRadius: 99,
                border: `1px solid ${status === s ? "var(--blue)" : "var(--border)"}`,
                background: status === s ? "rgba(79,195,247,0.12)" : "transparent",
                color: status === s ? "var(--blue)" : "var(--text-secondary)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                textTransform: "uppercase", cursor: "pointer",
              }}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
