import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Wrench, Wind, Flame, Zap, Thermometer } from "lucide-react";
import StatusBadge from "../shared/StatusBadge";

// Icon + color by job type
function getIconStyle(jobType, status, safetyHazard) {
  if (safetyHazard) return { bg: "#ff3d3d18", color: "var(--red)", Icon: Zap };
  if (status === "resolved") return { bg: "#00e09a14", color: "var(--green)", Icon: Wrench };
  const t = (jobType || "").toLowerCase();
  if (/cool|freez|airflow|not cool/.test(t)) return { bg: "#00b4ff14", color: "var(--blue)", Icon: Wind };
  if (/heat|furnace|warm/.test(t))           return { bg: "#ff3d3d14", color: "var(--red)", Icon: Flame };
  if (/electr|breaker|trip|voltage/.test(t)) return { bg: "#ffc60014", color: "var(--yellow)", Icon: Zap };
  if (/temp|thermo/.test(t))                 return { bg: "#ff620014", color: "var(--accent-orange)", Icon: Thermometer };
  return { bg: "#ff620014", color: "var(--accent-orange)", Icon: Wrench };
}

// Truncate to n chars
const trunc = (str, n) => str && str.length > n ? str.slice(0, n) + "…" : (str || "—");

export default function JobCard({ job, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(job.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const { bg, color, Icon } = getIconStyle(job.job_type, job.status, job.safety_hazard);

  const saveNotes = async () => {
    setIsSaving(true);
    await base44.entities.Job.update(job.id, { notes });
    setIsSaving(false);
    if (onUpdate) onUpdate();
  };

  const updateStatus = async (status) => {
    await base44.entities.Job.update(job.id, { status });
    if (onUpdate) onUpdate();
  };

  // 4 quick-view stats
  const stats = [
    { label: "YRS OLD",  value: job.unit_age != null ? String(job.unit_age) : "—" },
    { label: "REFRIG",   value: job.refrigerant_type ? job.refrigerant_type.replace("R-", "R") : "—" },
    { label: "CAUSE",    value: trunc(job.diagnosis, 10) },
    { label: "PARTS",    value: job.parts_needed ? "YES" : "—" },
  ];

  const borderColor = job.safety_hazard ? "var(--red)" : "var(--border)";

  return (
    <div style={{
      background: "var(--bg-card)",
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* ── Top section: always visible header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          gap: 12, padding: "12px 14px", textAlign: "left",
          background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        {/* Type icon */}
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={17} color={color} />
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-condensed" style={{
            fontSize: 14, fontWeight: 700, color: "var(--text-primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {job.unit_brand ? `${job.unit_brand} — ` : ""}{job.job_type || "Diagnostic"}
          </div>
          <div className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            {job.address || "No location"} · {format(new Date(job.created_date), "MMM d, h:mm a")}
          </div>
        </div>

        {/* Status + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <StatusBadge status={job.status} />
          {expanded
            ? <ChevronUp size={14} color="var(--text-muted)" />
            : <ChevronDown size={14} color="var(--text-muted)" />}
        </div>
      </button>

      {/* ── Bottom of header: 4 stat boxes ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
        borderTop: "1px solid var(--border)",
      }}>
        {stats.map(({ label, value }, i) => (
          <div key={i} style={{
            padding: "7px 6px",
            textAlign: "center",
            borderRight: i < 3 ? "1px solid var(--border)" : "none",
            background: i % 2 === 0 ? "#111515" : "#0f1515",
          }}>
            <div className="font-display" style={{
              fontSize: 14, lineHeight: 1,
              color: value === "—" ? "var(--text-muted)" : "var(--text-primary)",
              letterSpacing: 0.5,
            }}>
              {value}
            </div>
            <div className="font-mono" style={{
              fontSize: 7, color: "var(--text-muted)",
              letterSpacing: 1, marginTop: 2, textTransform: "uppercase",
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {job.diagnosis && (
              <div>
                <div className="font-mono" style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>DIAGNOSIS</div>
                <p className="font-body" style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{job.diagnosis}</p>
              </div>
            )}

            {job.field_report && (
              <div>
                <div className="font-mono" style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>FIELD REPORT</div>
                <pre className="font-mono" style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{job.field_report}</pre>
              </div>
            )}

            {job.readings && Object.keys(job.readings).length > 0 && (
              <div>
                <div className="font-mono" style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>READINGS</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {Object.entries(job.readings).map(([key, val]) => (
                    <div key={key} style={{ background: "var(--bg-elevated)", borderRadius: 6, padding: "6px 8px" }}>
                      <div className="font-mono" style={{ fontSize: 9, color: "var(--text-muted)" }}>{key}</div>
                      <div className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {job.parts_needed && (
              <div>
                <div className="font-mono" style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>PARTS NEEDED</div>
                <p className="font-body" style={{ fontSize: 13, color: "var(--yellow)" }}>{job.parts_needed}</p>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className="font-mono" style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>NOTES</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add field notes..."
                rows={2}
                style={{
                  width: "100%", resize: "none", boxSizing: "border-box",
                  background: "var(--bg-elevated)", color: "var(--text-primary)",
                  border: "1px solid var(--border)", borderRadius: 8,
                  padding: "8px 10px", fontFamily: "'Orbitron', sans-serif",
                  fontSize: 13, outline: "none",
                }}
                onFocus={e  => { e.target.style.borderColor = "#ff620050"; }}
                onBlur={e   => { e.target.style.borderColor = "var(--border)"; }}
              />
              <button
                onClick={saveNotes}
                disabled={isSaving}
                style={{
                  marginTop: 6, padding: "6px 14px", borderRadius: 8,
                  background: "var(--accent-orange)", color: "#fff",
                  border: "none", cursor: "pointer",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                }}
              >
                {isSaving ? "SAVING..." : "SAVE NOTES"}
              </button>
            </div>

            {/* Status update */}
            <div>
              <div className="font-mono" style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>UPDATE STATUS</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["resolved", "follow_up", "safety_flag", "in_progress"].map(s => (
                  <button key={s} onClick={() => updateStatus(s)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                      background: job.status === s ? "var(--accent-orange)" : "var(--bg-elevated)",
                      color: job.status === s ? "#fff" : "var(--text-secondary)",
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 9, fontWeight: 700, letterSpacing: 1,
                      textTransform: "uppercase", cursor: "pointer",
                    }}>
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}