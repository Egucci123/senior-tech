import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Microscope, History, BookOpen, Settings } from "lucide-react";

const NAV_ITEMS = [
  { name: "DIAGNOSE", page: "Diagnose", Icon: Microscope },
  { name: "HISTORY",  page: "History",  Icon: History },
  { name: "MANUALS",  page: "Manuals",  Icon: BookOpen },
  { name: "SETTINGS", page: "Settings", Icon: Settings },
];

// Wrench SVG as inline icon (cleaner than lucide's wrench)
function WrenchIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export default function Layout({ children, currentPageName }) {
  const hideNav = ["Login"].includes(currentPageName);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text-primary)" }}>
      {/* Header */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 60,
        background: "rgba(14,14,14,0.98)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
      }}>
        {/* Left: logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <WrenchIcon size={20} color="var(--blue)" />
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 20, fontWeight: 900, lineHeight: 1,
              textTransform: "uppercase", letterSpacing: "-0.01em",
              color: "var(--blue)",
            }}>
              SENIOR TECH
            </div>
            {currentPageName === "Diagnose" && (
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1, marginTop: 1,
              }}>
                SYSTEM DIAGNOSTICS V4.2
              </div>
            )}
          </div>
        </div>

        {/* Right: notification bell */}
        <button style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          background: "none", border: "none", cursor: "pointer", borderRadius: 6,
          color: "var(--text-muted)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      </header>

      {/* Page content */}
      <div className="page-in"
        style={{ paddingTop: 60, paddingBottom: hideNav ? 0 : 64 }}>
        {children}
      </div>

      {/* Bottom nav */}
      {!hideNav && (
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          height: 64,
          background: "rgba(28,27,27,0.98)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", height: 64, maxWidth: 500, margin: "0 auto" }}>
            {NAV_ITEMS.map(({ name, page, Icon }) => {
              const active = currentPageName === page;
              return (
                <Link key={page} to={createPageUrl(page)} style={{
                  flex: 1,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 3, textDecoration: "none",
                  color: active ? "var(--blue)" : "var(--text-muted)",
                  position: "relative",
                  background: active ? "rgba(32,31,31,1)" : "transparent",
                  transition: "color 0.15s",
                }}>
                  {active && (
                    <div style={{
                      position: "absolute", top: 0, left: "15%", right: "15%",
                      height: 2, background: "var(--blue)",
                    }} />
                  )}
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    {name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
