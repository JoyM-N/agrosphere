"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, RefreshCw, Droplets, Leaf, CloudSun,
  Sprout, AlertTriangle, Info, Bot,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/useAuthStore";
import {
  getFarmEconomics,
  type CropEconomicsRow,
  type EconomicsResponse,
} from "@/lib/api";

function kes(n: number): string {
  return `KES ${Math.round(n).toLocaleString()}`;
}

function gradeColor(grade: string): string {
  if (grade === "A") return "#4A9661";
  if (grade === "B") return "#6B9E4A";
  if (grade === "C") return "#E58B19";
  if (grade === "D") return "#D9692A";
  return "#B45309";
}

function MarginCard({ row, highlight }: { row: CropEconomicsRow; highlight?: boolean }) {
  const positive = row.estimated_margin_kes_per_acre >= 0;
  return (
    <div
      style={{
        background: "white",
        border: highlight ? "1px solid rgba(229,139,25,0.45)" : "1px solid #E3DAC9",
        borderRadius: 16,
        padding: "1.1rem 1.2rem",
        boxShadow: highlight ? "0 0 0 3px rgba(229,139,25,0.08)" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 900, color: "#2C2010", fontSize: "1rem" }}>
            {row.display}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#A39686", marginTop: 2 }}>
            {row.unit} · {row.cycle_months} mo cycle · water {row.water_intensity}
            {row.ml_confidence_pct ? ` · ML ${row.ml_confidence_pct}` : ""}
          </div>
        </div>
        <div
          style={{
            fontWeight: 900,
            fontSize: "0.95rem",
            color: positive ? "#3D7A4E" : "#B45309",
            textAlign: "right",
          }}
        >
          {positive ? "+" : ""}
          {kes(row.estimated_margin_kes_per_acre)}
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#A39686" }}>
            {row.margin_pct}% margin
          </div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          fontSize: "0.75rem",
        }}
      >
        <div>
          <div style={{ color: "#A39686", fontWeight: 700 }}>Revenue</div>
          <div style={{ color: "#2C2010", fontWeight: 800 }}>
            {kes(row.estimated_revenue_kes_per_acre)}
          </div>
        </div>
        <div>
          <div style={{ color: "#A39686", fontWeight: 700 }}>Cost</div>
          <div style={{ color: "#2C2010", fontWeight: 800 }}>
            {kes(row.estimated_cost_kes_per_acre)}
          </div>
        </div>
        <div>
          <div style={{ color: "#A39686", fontWeight: 700 }}>Price / unit</div>
          <div style={{ color: "#2C2010", fontWeight: 800 }}>
            {kes(row.price_kes)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EconomicsPage() {
  const { activeFarmId } = useAuthStore();
  const [data, setData] = useState<EconomicsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFarmEconomics(activeFarmId);
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load economics");
    } finally {
      setLoading(false);
    }
  }, [activeFarmId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sus = data?.sustainability;
  const pillars = sus
    ? [
        { key: "water", label: "Water", icon: Droplets, data: sus.pillars.water },
        { key: "soil", label: "Soil", icon: Leaf, data: sus.pillars.soil },
        { key: "climate", label: "Climate", icon: CloudSun, data: sus.pillars.climate },
      ]
    : [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#4A9661",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            <TrendingUp size={12} />
            Economics & sustainability
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 900,
              color: "#2C2010",
              letterSpacing: "-0.02em",
              marginBottom: 6,
            }}
          >
            Profit & planet check
          </h1>
          <p style={{ color: "#A39686", fontSize: "0.9rem", maxWidth: 520 }}>
            Curated KES planning figures by region, plus a rule-based sustainability
            score from water, soil, and climate — not fake ML.
          </p>
        </div>
        <button
          type="button"
          className="agro-btn-ghost"
          disabled={loading}
          onClick={() => void load()}
          style={{ fontSize: "0.82rem" }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {data && (
        <p
          style={{
            fontSize: "0.78rem",
            color: "#6B5B49",
            marginBottom: "1.25rem",
            lineHeight: 1.5,
            padding: "0.75rem 1rem",
            background: "rgba(229,139,25,0.06)",
            border: "1px solid rgba(229,139,25,0.2)",
            borderRadius: 12,
          }}
        >
          <Info size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          {data.disclaimer}
        </p>
      )}

      {loading && !data ? (
        <p style={{ color: "#A39686" }}>Loading economics…</p>
      ) : data ? (
        <>
          {data.farm_name && (
            <p style={{ fontSize: "0.82rem", color: "#6B5B49", marginBottom: "1rem" }}>
              {data.farm_name}
              {data.region ? ` · ${data.region.replace("_", " ")}` : ""}
              {data.has_recommendation === false &&
                " · run a recommendation for a crop-specific focus"}
            </p>
          )}

          {/* Sustainability hero */}
          {sus && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: "1.75rem",
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  background: "white",
                  border: "1px solid #E3DAC9",
                  borderRadius: 18,
                  padding: "1.25rem",
                  textAlign: "center",
                  minWidth: 140,
                  flex: "0 0 160px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    color: "#A39686",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Sustainability
                </div>
                <div
                  style={{
                    fontSize: "2.75rem",
                    fontWeight: 900,
                    color: gradeColor(sus.grade),
                    lineHeight: 1.1,
                    margin: "0.35rem 0",
                  }}
                >
                  {sus.grade}
                </div>
                <div style={{ fontWeight: 800, color: "#2C2010" }}>{sus.score}/100</div>
                <div style={{ fontSize: "0.68rem", color: "#A39686", marginTop: 6 }}>
                  {sus.method.replace(/_/g, " ")}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 280px" }}>
                {pillars.map((p) => (
                  <div
                    key={p.key}
                    style={{
                      background: "white",
                      border: "1px solid #E3DAC9",
                      borderRadius: 14,
                      padding: "0.85rem 1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 800,
                          fontSize: "0.85rem",
                          color: "#2C2010",
                        }}
                      >
                        <p.icon size={14} color="#E58B19" />
                        {p.label}
                      </span>
                      <span style={{ fontWeight: 900, color: "#2C2010" }}>
                        {p.data.score}
                      </span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {p.data.reasons.slice(0, 2).map((r) => (
                        <li
                          key={r}
                          style={{ fontSize: "0.78rem", color: "#6B5B49", lineHeight: 1.45 }}
                        >
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p style={{ fontSize: "0.72rem", color: "#A39686", margin: 0 }}>
                  {sus.method_note}
                </p>
              </div>
            </div>
          )}

          {sus && sus.tips.length > 0 && (
            <div
              style={{
                marginBottom: "1.75rem",
                padding: "1rem 1.15rem",
                borderRadius: 14,
                border: "1px solid rgba(74,150,97,0.25)",
                background: "rgba(74,150,97,0.06)",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  color: "#2C2010",
                  marginBottom: 6,
                }}
              >
                Practical tips
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {sus.tips.map((t) => (
                  <li
                    key={t}
                    style={{ fontSize: "0.84rem", color: "#6B5B49", lineHeight: 1.5 }}
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Focus crop */}
          <h2
            style={{
              fontWeight: 800,
              fontSize: "1.05rem",
              color: "#2C2010",
              marginBottom: 10,
            }}
          >
            {data.focus ? "Focus crop economics" : "Crop economics"}
          </h2>
          {data.focus ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <MarginCard row={data.focus} highlight />
              {data.focus.assumptions && (
                <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                  {data.focus.assumptions.map((a) => (
                    <li
                      key={a}
                      style={{ fontSize: "0.75rem", color: "#A39686", lineHeight: 1.45 }}
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p style={{ color: "#A39686", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
              {data.message ||
                "Run a crop recommendation to lock a focus crop for margin estimates."}
            </p>
          )}

          {/* Alternatives */}
          {(data.alternatives?.length ?? 0) > 0 && (
            <>
              <h2
                style={{
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  color: "#2C2010",
                  marginBottom: 10,
                }}
              >
                Compare options
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 12,
                  marginBottom: "1.75rem",
                }}
              >
                {data.alternatives
                  .filter((a) => !data.focus || a.crop !== data.focus.crop)
                  .slice(0, 4)
                  .map((row) => (
                    <MarginCard key={row.crop} row={row} />
                  ))}
              </div>
            </>
          )}

          {!data.has_recommendation && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "0.9rem 1rem",
                borderRadius: 12,
                border: "1px solid rgba(229,139,25,0.3)",
                background: "rgba(229,139,25,0.07)",
                marginBottom: "1.5rem",
              }}
            >
              <AlertTriangle size={16} color="#E58B19" style={{ marginTop: 2 }} />
              <p style={{ fontSize: "0.84rem", color: "#6B5B49", margin: 0, lineHeight: 1.5 }}>
                No saved recommendation yet — showing regional staples. Run a recommendation
                for margins tied to your ML top crops.
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href="/recommend">
              <button className="agro-btn" style={{ fontSize: "0.82rem" }}>
                <Sprout size={14} />
                Get recommendation
              </button>
            </Link>
            <Link href="/assistant">
              <button className="agro-btn-ghost" style={{ fontSize: "0.82rem" }}>
                <Bot size={14} />
                Ask about margins
              </button>
            </Link>
          </div>
        </>
      ) : (
        <p style={{ color: "#A39686" }}>No economics data.</p>
      )}
    </div>
  );
}
