import React from "react";
import {
  Snowflake, RefreshCw, ZapOff, CloudSnow,
  Wind, Flame, ArrowLeftRight, Zap,
  TrendingUp, Volume2, Droplets, Thermometer,
} from "lucide-react";

const CHIPS = [
  { label: "Not Cooling",        icon: Snowflake,      color: "#4fc3f7" },
  { label: "Short Cycling",      icon: RefreshCw,       color: "#ffb300" },
  { label: "No Compressor",      icon: ZapOff,          color: "#f44336" },
  { label: "Freezing Up",        icon: CloudSnow,       color: "#4fc3f7" },
  { label: "Weak Airflow",       icon: Wind,            color: "#4caf50" },
  { label: "No Heat",            icon: Flame,           color: "#f44336" },
  { label: "Heat Pump No Cool",  icon: ArrowLeftRight,  color: "#ffb300" },
  { label: "Tripping Breaker",   icon: Zap,             color: "#f44336" },
  { label: "High Electric Bill", icon: TrendingUp,      color: "#ffb300" },
  { label: "Strange Noise",      icon: Volume2,         color: "#9e9e9e" },
  { label: "Leaking Water",      icon: Droplets,        color: "#4fc3f7" },
  { label: "Thermostat Issue",   icon: Thermometer,     color: "#4caf50" },
];

export default function QuickChips({ onSelect }) {
  return (
    <div style={{ overflowX: "auto", padding: "10px 16px 8px", flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
        {CHIPS.map(({ label, icon: Icon, color }) => (
          <button
            key={label}
            onClick={() => onSelect(label)}
            className="btn-press"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              padding: "7px 13px 7px 10px",
              borderRadius: 99,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13, fontWeight: 600,
              letterSpacing: "0.05em", textTransform: "uppercase",
              whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = color + "15";
              e.currentTarget.style.borderColor = color + "60";
              e.currentTarget.style.color = color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "var(--bg-card)";
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <Icon size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
