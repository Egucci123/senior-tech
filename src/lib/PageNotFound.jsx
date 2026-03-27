import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AlertTriangle } from "lucide-react";

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--accent-orange)" }} />
        <h1 className="font-display text-5xl tracking-wider mb-2" style={{ color: "var(--accent-orange)" }}>404</h1>
        <p className="font-body text-lg mb-6" style={{ color: "var(--text-secondary)" }}>Page not found</p>
        <Link to={createPageUrl("Diagnose")}
          className="btn-accent inline-block px-6 py-3 rounded-xl text-base font-bold">
          BACK TO DIAGNOSE
        </Link>
      </div>
    </div>
  );
}