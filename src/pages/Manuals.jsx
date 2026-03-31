import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { BookOpen, ExternalLink, FileText, X, Wrench } from "lucide-react";
import { ManualsStore } from '../store/manuals';

const DOC_COLORS = {
  install: "#4caf50",
  service: "#4fc3f7",
  wiring:  "#ffb300",
  default: "#9e9e9e",
};
function docColor(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("install"))                         return DOC_COLORS.install;
  if (t.includes("service") || t.includes("maint")) return DOC_COLORS.service;
  if (t.includes("wiring"))                          return DOC_COLORS.wiring;
  return DOC_COLORS.default;
}

// Full-screen PDF viewer overlay
function PdfViewer({ doc, onClose }) {
  const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(doc.url)}`;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#000", display: "flex", flexDirection: "column",
    }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer", padding: 4,
        }}>
          <X size={20} color="var(--text-primary)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 14, fontWeight: 700, color: "var(--text-primary)",
            textTransform: "uppercase", letterSpacing: "0.04em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {doc.title || doc.type}
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, color: docColor(doc.type),
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            {doc.type}
          </div>
        </div>
        <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12, fontWeight: 600, color: "var(--blue)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          textDecoration: "none",
        }}>
          <ExternalLink size={14} />
          BROWSER
        </a>
      </div>

      {/* PDF iframe */}
      <iframe
        src={proxyUrl}
        style={{ flex: 1, width: "100%", border: "none", background: "#fff" }}
        title={doc.title || doc.type}
      />
    </div>
  );
}

function DocCard({ doc }) {
  const [viewing, setViewing] = useState(false);
  const color = docColor(doc.type);
  const isPdf = doc.isPdf || doc.url?.toLowerCase().includes('.pdf');

  return (
    <>
      {viewing && isPdf && (
        <PdfViewer doc={doc} onClose={() => setViewing(false)} />
      )}
      <div
        onClick={() => isPdf ? setViewing(true) : window.open(doc.url, '_blank')}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 14px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderLeft: `3px solid ${color}`,
          borderRadius: 6, cursor: "pointer",
        }}
      >
        {isPdf
          ? <FileText size={18} style={{ color, flexShrink: 0 }} />
          : <BookOpen size={18} style={{ color, flexShrink: 0 }} />
        }
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
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10, fontWeight: 600,
              color: isPdf ? "var(--green)" : "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {isPdf ? "PDF — OPENS IN APP" : "WEB PAGE"}
            </span>
          </div>
        </div>
        {isPdf
          ? <FileText size={13} style={{ color: "var(--green)", flexShrink: 0 }} />
          : <ExternalLink size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        }
      </div>
    </>
  );
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
          <div style={{ display: "flex", gap: 10, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
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
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "var(--text-muted)" }}>
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
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, color: "var(--text-muted)",
          }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

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
            {(documents || []).map((doc, i) => (
              <DocCard key={i} doc={doc} />
            ))}
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
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 22, fontWeight: 900, color: "var(--text-primary)",
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>MANUALS</div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2,
        }}>{entries.length} of 5 saved · Auto-populated from data plate reads</div>
      </div>
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
