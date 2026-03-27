import React from "react";
import { Briefcase, TrendingUp, Wrench, Building2 } from "lucide-react";

export default function AdminStats({ jobs }) {
  const now = new Date();
  const thisWeek = jobs.filter(j => {
    const d = new Date(j.created_date);
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  const thisMonth = jobs.filter(j => {
    const d = new Date(j.created_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Most common brands
  const brandCounts = {};
  jobs.forEach(j => { if (j.unit_brand) brandCounts[j.unit_brand] = (brandCounts[j.unit_brand] || 0) + 1; });
  const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0];

  // Most common job types
  const typeCounts = {};
  jobs.forEach(j => { if (j.job_type) typeCounts[j.job_type] = (typeCounts[j.job_type] || 0) + 1; });
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  const safetyCount = jobs.filter(j => j.safety_hazard).length;

  const stats = [
    { label: "THIS WEEK", value: thisWeek.length, icon: Briefcase, color: "var(--accent-orange)" },
    { label: "THIS MONTH", value: thisMonth.length, icon: TrendingUp, color: "var(--blue)" },
    { label: "TOP ISSUE", value: topType ? topType[0] : "---", icon: Wrench, color: "var(--yellow)" },
    { label: "TOP BRAND", value: topBrand ? topBrand[0] : "---", icon: Building2, color: "var(--green)" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s, i) => (
          <div key={i} className="rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              <p className="text-[10px] font-bold font-body tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
            <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
      {safetyCount > 0 && (
        <div className="rounded-xl px-4 py-2.5 flex items-center gap-2"
          style={{ background: "#ff3d3d15", border: "1px solid #ff3d3d44" }}>
          <p className="font-body text-sm font-bold" style={{ color: "var(--red)" }}>
            {safetyCount} SAFETY FLAG{safetyCount > 1 ? "S" : ""}
          </p>
        </div>
      )}
    </div>
  );
}