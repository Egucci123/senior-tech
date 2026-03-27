import React from "react";

const FIELD_CONFIG = [
  { key: "model_number",    label: "MODEL" },
  { key: "serial_number",   label: "SERIAL" },
  { key: "unit_type",       label: "TYPE" },
  { key: "tonnage",         label: "TONNAGE" },
  { key: "btuh",            label: "BTU/H" },
  { key: "voltage",         label: "VOLTAGE" },
  { key: "refrigerant_type",label: "REFRIGERANT", color: "var(--green)" },
  { key: "seer",            label: "SEER" },
  { key: "amps_rla",        label: "RLA" },
  { key: "amps_mca",        label: "MCA" },
  { key: "amps_mop",        label: "MOP" },
  { key: "charge_oz",       label: "CHARGE OZ" },
  { key: "manufacture_date",label: "MFR YEAR", color: "var(--yellow)" },
];

export default function UnitCard({ data }) {
  if (!data) return null;

  const age = data.manufacture_date
    ? new Date().getFullYear() - parseInt(data.manufacture_date)
    : data.unit_age;

  const fields = FIELD_CONFIG.filter(({ key }) => data[key] != null);

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      {/* Card header: brand + age badge */}
      <div style={{
        background: "var(--bg-card-header)",
        borderBottom: "1px solid var(--border)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span className="font-display" style={{ fontSize: 22, color: "var(--accent-orange)", letterSpacing: 1.5 }}>
          {(data.brand || "UNKNOWN BRAND").toUpperCase()}
        </span>
        {age != null && (
          <div style={{ textAlign: "center", marginLeft: 12 }}>
            <div className="font-display" style={{ fontSize: 30, lineHeight: 1, color: "var(--yellow)" }}>
              {age}
            </div>
            <div className="font-mono" style={{ fontSize: 8, color: "var(--yellow)", letterSpacing: 1.5, opacity: 0.8, marginTop: 1 }}>
              YRS OLD
            </div>
          </div>
        )}
      </div>

      {/* Data grid: alternating rows, 2 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {fields.map(({ key, label, color }, i) => {
          const val = data[key];
          const rowIndex = Math.floor(i / 2);
          const isLeftCol = i % 2 === 0;
          const rowBg = rowIndex % 2 === 0 ? "#111515" : "#0f1515";
          return (
            <div key={key} style={{
              background: rowBg,
              borderBottom: "1px solid var(--border)",
              borderRight: isLeftCol ? "1px solid var(--border)" : "none",
              padding: "9px 13px",
            }}>
              <div className="font-mono" style={{
                fontSize: 8, color: "var(--text-muted)",
                letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3,
              }}>
                {label}
              </div>
              <div className="font-mono" style={{
                fontSize: 13, fontWeight: 600,
                color: color || "var(--text-primary)",
              }}>
                {val}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}