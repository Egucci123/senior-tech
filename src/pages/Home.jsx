import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { TicketStore } from "../components/ticketStore";
import { format, isThisWeek } from "date-fns";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "GOOD MORNING";
  if (h < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function getProfile() {
  try { return JSON.parse(localStorage.getItem("senior_tech_profile") || "{}"); }
  catch { return {}; }
}

function RecentJobCard({ ticket }) {
  const profile = getProfile();
  const summary = ticket.summary || {};
  const unit = [summary.brand, summary.model].filter(Boolean).join(" ") || "DIAGNOSTIC SESSION";
  const fault = summary.fault_code || "—";
  const status = ticket.status || "in_progress";
  const dateStr = format(new Date(ticket.created_date), "MMM d // HH:mm").toUpperCase();

  const statusColor = {
    resolved: "var(--green)", follow_up: "var(--amber)",
    safety_flag: "var(--red)", in_progress: "var(--blue)",
  }[status] || "var(--blue)";

  const statusLabel = {
    resolved: "COMPLETE", follow_up: "FOLLOW UP",
    safety_flag: "SAFETY", in_progress: "IN PROGRESS",
  }[status] || "IN PROGRESS";

  return (
    <div style={{
      minWidth: 240, background: "var(--bg-card)",
      border: "1px solid var(--border)", borderRadius: 8,
      padding: 14, flexShrink: 0,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.12em",
        }}>
          {dateStr}
        </span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: statusColor,
          background: statusColor + "15",
          border: `1px solid ${statusColor}30`,
          padding: "2px 8px", borderRadius: 4,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {status === "in_progress" && (
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: statusColor,
              animation: "pulseBadge 2s ease-in-out infinite",
              display: "inline-block",
            }} />
          )}
          {statusLabel}
        </span>
      </div>

      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 18, fontWeight: 900, color: "var(--text-primary)",
        textTransform: "uppercase", letterSpacing: "0.02em",
        marginBottom: 2, lineHeight: 1.1,
      }}>
        {unit}
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginTop: 10,
        padding: "6px 10px",
        background: "var(--bg)", borderRadius: 4,
        borderLeft: `2px solid ${statusColor}`,
      }}>
        <AlertTriangle size={12} color={statusColor} />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 10, fontWeight: 700, color: statusColor,
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          {fault}
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const profile = getProfile();
  const name = profile.name || "TECH";
  const tickets = TicketStore.getAll();

  const stats = useMemo(() => {
    const thisWeek = tickets.filter(t => isThisWeek(new Date(t.created_date)));
    const topFault = (() => {
      const counts = {};
      tickets.forEach(t => {
        const fc = t.summary?.fault_code;
        if (fc) counts[fc] = (counts[fc] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return top ? top[0].slice(0, 6).toUpperCase() : "—";
    })();
    return { week: thisWeek.length, topFault };
  }, [tickets]);

  const recent = tickets.slice(0, 5);

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Greeting */}
      <div style={{ padding: "20px 16px 0" }}>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 36, fontWeight: 900, color: "var(--text-primary)",
          textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1,
        }}>
          {getGreeting()}, {name.split(" ")[0].toUpperCase()}
        </h1>
        <p style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 5,
        }}>
          {format(new Date(), "EEEE, MMMM d").toUpperCase()} // {format(new Date(), "HH:mm")}
        </p>
      </div>

      {/* START DIAGNOSIS */}
      <div style={{ padding: "20px 16px 0" }}>
        <button
          onClick={() => navigate(createPageUrl("Diagnose"))}
          className="btn-press"
          style={{
            width: "100%", height: 56,
            background: "var(--blue)", color: "#0f0f0f",
            border: "none", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
            cursor: "pointer",
            boxShadow: "0 0 24px rgba(79,195,247,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          <Zap size={22} fill="#0f0f0f" strokeWidth={2} />
          START DIAGNOSIS
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ padding: "16px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { value: String(stats.week),     label: "JOBS THIS WEEK" },
          { value: "—",                    label: "AVG CALL TIME" },
          { value: stats.topFault,         label: "TOP FAULT" },
        ].map(({ value, label }) => (
          <div key={label} style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "12px 10px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 26, fontWeight: 700, color: "var(--blue)", lineHeight: 1,
            }}>
              {value}
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9, fontWeight: 600, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 5, lineHeight: 1.2,
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 12, paddingLeft: 10,
          borderLeft: "2px solid var(--blue)",
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 14, fontWeight: 700, color: "var(--text-primary)",
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            RECENT JOBS
          </span>
          <button
            onClick={() => navigate(createPageUrl("History"))}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10, fontWeight: 700, color: "var(--blue)",
              textTransform: "uppercase", letterSpacing: "0.1em",
              background: "none", border: "none", cursor: "pointer",
            }}
          >
            VIEW ARCHIVE
          </button>
        </div>

        {recent.length === 0 ? (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "24px 16px", textAlign: "center",
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              NO JOBS YET — START A DIAGNOSIS TO GET GOING
            </span>
          </div>
        ) : (
          <div style={{
            display: "flex", gap: 10,
            overflowX: "auto", paddingBottom: 8,
          }}>
            {recent.map(t => <RecentJobCard key={t.id} ticket={t} />)}
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 6, padding: "10px 14px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--green)",
            boxShadow: "0 0 8px rgba(76,175,80,0.6)",
            animation: "pulseBadge 2s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.18em",
          }}>
            SENIOR TECH READY // SYSTEM_OK
          </span>
        </div>
      </div>
    </div>
  );
}
