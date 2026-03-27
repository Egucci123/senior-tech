import React from "react";

export default function ScanViewfinder() {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: 200,
      borderRadius: 12,
      overflow: "hidden",
      background: "#050808",
      border: "1px solid var(--border)",
      flexShrink: 0,
    }}>
      {/* Subtle radial bg */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 50%, #ff620010 0%, transparent 65%)",
      }} />

      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 6,
      }}>
        <div className="font-mono" style={{
          fontSize: 13, letterSpacing: 4,
          color: "#ff620066",
          textTransform: "uppercase",
          fontWeight: 600,
        }}>
          ALIGN NAMEPLATE
        </div>
        <div className="font-mono" style={{
          fontSize: 9, letterSpacing: 2,
          color: "#ff620040",
          textTransform: "uppercase",
        }}>
          BRAND · MODEL · SERIAL · REFRIGERANT
        </div>
      </div>

      {/* Corner brackets */}
      {[
        { style: { top: 14, left: 14 }, rotate: 0 },
        { style: { top: 14, right: 14 }, rotate: 90 },
        { style: { bottom: 14, right: 14 }, rotate: 180 },
        { style: { bottom: 14, left: 14 }, rotate: 270 },
      ].map((corner, i) => (
        <div key={i} className="corner-pulse" style={{
          position: "absolute",
          ...corner.style,
          transform: `rotate(${corner.rotate}deg)`,
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M0 14V4C0 1.79 1.79 0 4 0H14"
              stroke="#ff6200" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      ))}

      {/* Scanning line */}
      <div
        className="scan-line"
        style={{
          position: "absolute",
          left: 36, right: 36,
          height: 2,
          background: "linear-gradient(90deg, transparent 0%, #ff6200 20%, #ff6200 80%, transparent 100%)",
          boxShadow: "0 0 8px #ff6200, 0 0 20px #ff620055",
        }}
      />
    </div>
  );
}