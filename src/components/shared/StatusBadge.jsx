import React from "react";

const STATUS_CONFIG = {
  resolved:    { label: "RESOLVED",    cls: "badge-resolved" },
  follow_up:   { label: "FOLLOW UP",   cls: "badge-follow-up" },
  safety_flag: { label: "⚠ SAFETY",    cls: "badge-safety" },
  in_progress: { label: "IN PROGRESS", cls: "badge-in-progress pulse-live" },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.in_progress;
  return (
    <span className={`f-label ${config.cls}`} style={{
      fontSize: 10, fontWeight: 600,
      padding: "3px 10px", borderRadius: 99,
      whiteSpace: "nowrap", display: "inline-block",
    }}>
      {config.label}
    </span>
  );
}
