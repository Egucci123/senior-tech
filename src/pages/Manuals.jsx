import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { BookOpen, ExternalLink, ChevronDown, ChevronUp, Wrench } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { ManualsStore } from "../components/manualsStore";

const DOC_COLORS = {
  install: "#4caf50",
  service: "#4fc3f7",
  wiring:  "#ffb300",
  parts:   "#9e9e9e",
};
function docColor(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("install"))                         return DOC_COLORS.install;
  if (t.includes("service") || t.includes("maint")) return DOC_COLORS.service;
  if (t.includes("wiring"))                          return DOC_COLORS.wiring;
  if (t.includes("parts"))                           return DOC_COLORS.parts;
  return "#555555";
}

function ManualSet({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const { unit, documents, unit_summary, created_date } = entry;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 8, overflow: "hidden",
    }}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: "100%", display: "flex", alignItems: "center",
        gap: 12, padding: "12px 14px", textAlign: "left",
        background: "transparent", border: "none", cursor: "pointer",
      }}>
        <div className="hexagon" style={{
          width: 34, height: 34, flexShrink: 0,
          background: "rgba(79,195,247,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Wrench size={15} color="var(--blue)" strokeWidth={2.5} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 16, fontWeight: 700, color: "var(--text-primary)",
            textTransform: "uppercase", letterSpacing: "0.04em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {unit?.brand || "Unknown"}{unit?.model ? ` — ${unit.model}` : ""}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 3, alignItems: "center" }}>
            {unit?.unit_type && (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, fontWeight: 600, color: "var(--blue)",
                background: "rgba(79,195,247,0.1)", padding: "2px 8px",
                borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {unit.unit_type}
              </span>
            )}
            {unit?.refrigerant_type && (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, fontWeight: 600, color: "#ffb300",
                background: "rgba(255,179,0,0.1)", padding: "2px 8px",
                borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {unit.refrigerant_type}
              </span>
            )}
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11, color: "var(--text-muted)",
            }}>
              {format(new Date(created_date), "MMM d, h:mm a")}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {documents?.length || 0} DOCS
          </span>
          {expanded
            ? <ChevronUp size={14} color="var(--text-muted)" />
            : <ChevronDown size={14} color="var(--text-muted)" />}
        </div>
      </button>

      {/* Expanded docs */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px" }}>
          {unit_summary && (
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12, color: "var(--text-secondary)",
              lineHeight: 1.6, marginBottom: 12,
              padding: "10px 12px",
              background: "var(--bg-elevated)", borderRadius: 6,
            }}>
              {unit_summary}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(documents || []).map((doc, i) => {
              const color = docColor(doc.type);
              return (
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 6, textDecoration: "none",
                  }}>
                  <BookOpen size={18} style={{ color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {doc.title || doc.type}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 10, fontWeight: 600, color,
                        background: color + "18", padding: "1px 7px",
                        borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em",
                      }}>
                        {doc.type?.toUpperCase()}
                      </span>
                      {doc.source && (
                        <span style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 11, color: "var(--text-muted)",
                        }}>
                          {doc.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManualsPage() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(ManualsStore.getAll());
  }, []);

  return (
    <div style={{ paddingBottom: 24 }}>
      <PageHeader
        title="MANUALS"
        subtitle={`${entries.length} of 10 saved · Auto-populated from data plate reads`}
      />

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {entries.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "60px 24px", textAlign: "center",
          }}>
            <BookOpen size={48} style={{ color: "var(--bg-elevated)", marginBottom: 16 }} />
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 20, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--text-secondary)", marginBottom: 8,
            }}>
              NO MANUALS YET
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6,
            }}>
              Send Senior Tech a photo of an equipment data plate.<br />
              Manuals will auto-populate here after the unit is identified.
            </div>
          </div>
        ) : (
          entries.map(entry => (
            <ManualSet key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}
