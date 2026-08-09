import { useState } from "react";
import { EconomicCalendar } from "../components/charts/EconomicCalendar";
import { CalendarDays, Flame, Zap, Globe, Sparkles } from "lucide-react";

const REGIONS = [
  { id: "all", label: "Global", countries: "us,eu,gb,jp,cn,in,ca,au" },
  { id: "us", label: "🇺🇸 United States", countries: "us" },
  { id: "in", label: "🇮🇳 India", countries: "in" },
  { id: "eu", label: "🇪🇺 Eurozone", countries: "eu" },
  { id: "gb", label: "🇬🇧 United Kingdom", countries: "gb" },
  { id: "jp", label: "🇯🇵 Japan", countries: "jp" },
];

const IMPACTS = [
  { id: "high", label: "High Impact Only", filter: "0", icon: Flame },
  { id: "med-high", label: "High & Med Impact", filter: "0,1", icon: Zap },
  { id: "all", label: "All Events", filter: "-1,0,1", icon: Globe },
];

export function Calendar() {
  const [region, setRegion] = useState("all");
  const [impact, setImpact] = useState("med-high");

  const selectedRegion = REGIONS.find((r) => r.id === region) || REGIONS[0];
  const selectedImpact = IMPACTS.find((i) => i.id === impact) || IMPACTS[1];

  return (
    <div className="page-calendar" style={{ padding: "20px 24px 40px" }}>
      <div className="page-title-row" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "rgba(240, 185, 11, 0.15)", color: "#f0b90b", padding: "8px", borderRadius: "10px", display: "flex" }}>
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Economic Calendar</h1>
              <p className="page-sub" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                Real-time macroeconomic news, interest rate decisions & market-moving releases
              </p>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Impact Selector */}
          <div style={{ display: "flex", background: "var(--bg-secondary)", padding: "3px", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
            {IMPACTS.map((imp) => {
              const Icon = imp.icon;
              const active = impact === imp.id;
              return (
                <button
                  key={imp.id}
                  type="button"
                  onClick={() => setImpact(imp.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    borderRadius: "8px",
                    border: "none",
                    background: active ? "var(--bg-tertiary)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={14} />
                  <span>{imp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Region Selector */}
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{
              padding: "7px 14px",
              fontSize: "0.82rem",
              fontWeight: 600,
              borderRadius: "10px",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel" style={{ background: "var(--bg-secondary)", borderRadius: "14px", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
        <div className="panel-header" style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>Upcoming Market Releases</h3>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {selectedRegion.label} · {selectedImpact.label}
          </span>
        </div>
        <div className="widget-body" style={{ height: "calc(100vh - 200px)", minHeight: "560px", padding: "10px" }}>
          <EconomicCalendar
            importanceFilter={selectedImpact.filter}
            countryFilter={selectedRegion.countries}
          />
        </div>
      </div>
    </div>
  );
}
