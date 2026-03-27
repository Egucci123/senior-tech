import React, { useState, useEffect } from "react";
import { Wrench } from "lucide-react";
import TicketCard from "../components/history/TicketCard";
import { TicketStore } from "../components/ticketStore";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const FILTERS = [
  { key: "all",         label: "ALL" },
  { key: "in_progress", label: "IN PROGRESS" },
  { key: "resolved",    label: "COMPLETE" },
  { key: "follow_up",   label: "FOLLOW UP" },
];

export default function HistoryPage() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter]   = useState("all");
  const navigate = useNavigate();

  const load = () => setTickets(TicketStore.getAll());
  useEffect(() => { load(); }, []);

  const visible = filter === "all"
    ? tickets
    : tickets.filter(t => (t.status || "in_progress") === filter);

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Filter pills */}
      <div style={{
        padding: "14px 16px 10px",
        display: "flex", gap: 8, overflowX: "auto",
        borderBottom: "1px solid var(--border)",
      }}>
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="btn-press"
              style={{
                padding: "8px 18px", borderRadius: 99, flexShrink: 0,
                background: active ? "var(--blue)" : "var(--bg-card)",
                color: active ? "#0f0f0f" : "var(--text-muted)",
                border: `1px solid ${active ? "var(--blue)" : "var(--border)"}`,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 13, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Count */}
      {tickets.length > 0 && (
        <div style={{ padding: "10px 16px 0" }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 600, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.12em",
          }}>
            {visible.length} JOB{visible.length !== 1 ? "S" : ""} · {tickets.length} OF 10 STORED
          </span>
        </div>
      )}

      {/* List */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "60px 24px", textAlign: "center",
          }}>
            <Wrench size={48} style={{ color: "var(--bg-elevated)", marginBottom: 16 }} />
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22, fontWeight: 900,
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--text-secondary)", marginBottom: 8,
            }}>
              NO JOBS YET
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 20,
            }}>
              {filter === "all"
                ? "Start your first diagnosis to see history here."
                : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} jobs.`}
            </div>
            {filter === "all" && (
              <button
                onClick={() => navigate(createPageUrl("Diagnose"))}
                className="btn-press"
                style={{
                  padding: "12px 28px", borderRadius: 8,
                  background: "var(--blue)", color: "#0f0f0f", border: "none",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 16, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer",
                  boxShadow: "0 0 20px rgba(79,195,247,0.2)",
                }}
              >
                START DIAGNOSIS
              </button>
            )}
          </div>
        ) : (
          visible.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} onUpdate={load} />
          ))
        )}
      </div>
    </div>
  );
}
