import React from "react";

export default function PageHeader({ title, subtitle }) {
  return (
    <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid var(--border)" }}>
      <h1 style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 22, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.06em",
        color: "#ffffff", margin: 0, lineHeight: 1,
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12, fontWeight: 500,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: "var(--text-secondary)", marginTop: 4,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
