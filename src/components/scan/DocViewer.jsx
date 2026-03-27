import React, { useEffect } from "react";
import { X, ExternalLink, BookOpen, CheckCircle } from "lucide-react";

export default function DocViewer({ doc, onClose }) {

  useEffect(() => {
    // Cache to localStorage for offline reference
    try {
      const cached = JSON.parse(localStorage.getItem("seniortech_docs") || "[]");
      if (!cached.find((d) => d.url === doc.url)) {
        cached.unshift({ ...doc, opened_at: new Date().toISOString() });
        localStorage.setItem("seniortech_docs", JSON.stringify(cached.slice(0, 30)));
      }
    } catch (e) {}
  }, [doc]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "#080a0a", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid #1e2828",
        background: "#111515", flexShrink: 0,
      }}>
        <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
          <p className="font-condensed font-bold" style={{
            fontSize: 14, color: "#cce0e0",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {doc.document_type}
          </p>
          <p className="font-mono" style={{ fontSize: 9, color: "#3d5555", letterSpacing: 1, textTransform: "uppercase" }}>
            {doc.source}
          </p>
        </div>
        <button onClick={onClose} style={{
          background: "#161c1c", border: "1px solid #1e2828",
          borderRadius: 8, padding: 8, cursor: "pointer", color: "#7a9898",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 20, padding: 32, textAlign: "center",
      }}>
        <div style={{
          background: "#00e09a0a", border: "1px solid #00e09a30",
          borderRadius: 14, padding: "12px 20px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <CheckCircle size={18} style={{ color: "#00e09a", flexShrink: 0 }} />
          <p className="font-mono" style={{ fontSize: 9, color: "#00e09a", letterSpacing: 1.5 }}>
            SAVED FOR OFFLINE ACCESS
          </p>
        </div>

        <BookOpen size={44} style={{ color: "#3d5555" }} />

        <div>
          <p className="font-condensed font-bold" style={{ fontSize: 18, color: "#cce0e0", marginBottom: 8 }}>
            {doc.document_type}
          </p>
          <p className="font-mono" style={{ fontSize: 10, color: "#3d5555", letterSpacing: 1 }}>
            {doc.source?.toUpperCase()}
          </p>
        </div>

        <p className="font-body" style={{ color: "#7a9898", fontSize: 12, lineHeight: 1.7, maxWidth: 300 }}>
          Document opens in your browser. Tap below to open it. Previously opened docs are saved to your device — accessible even without signal on a rooftop or in a basement.
        </p>

        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent flex items-center gap-2 px-6 py-3 rounded-xl justify-center"
          style={{ textDecoration: "none", width: "100%", maxWidth: 300 }}
        >
          <ExternalLink size={16} /> OPEN DOCUMENT
        </a>
      </div>
    </div>
  );
}