"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, AlertTriangle, CloudRain, Sprout, RefreshCw,
  Droplets, Thermometer, Info, Bot,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/useAuthStore";
import { getFarmAlerts, type AlertsResponse, type FarmAlert } from "@/lib/api";

function levelColor(level: string): { bg: string; border: string; text: string } {
  if (level === "warning" || level === "critical") {
    return {
      bg: "rgba(217,105,42,0.1)",
      border: "rgba(217,105,42,0.35)",
      text: "#B45309",
    };
  }
  if (level === "watch") {
    return {
      bg: "rgba(229,139,25,0.1)",
      border: "rgba(229,139,25,0.35)",
      text: "#C56F10",
    };
  }
  return {
    bg: "rgba(74,150,97,0.08)",
    border: "rgba(74,150,97,0.3)",
    text: "#3D7A4E",
  };
}

function kindIcon(kind: string) {
  if (kind === "drought") return Droplets;
  if (kind === "heat") return Thermometer;
  if (kind === "planting_window") return Sprout;
  if (kind === "heavy_rain" || kind === "cold") return CloudRain;
  return Bell;
}

function AlertCard({ alert }: { alert: FarmAlert }) {
  const c = levelColor(alert.level);
  const Icon = kindIcon(alert.kind);
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "1rem 1.1rem",
        borderRadius: 14,
        border: `1px solid ${c.border}`,
        background: c.bg,
      }}
    >
      <Icon size={18} color={c.text} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: "0.78rem", fontWeight: 800, color: "#2C2010",
              textTransform: "capitalize",
            }}
          >
            {alert.kind.replace(/_/g, " ")}
          </span>
          <span
            style={{
              fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase",
              letterSpacing: "0.06em", color: c.text,
              background: "rgba(255,255,255,0.65)",
              padding: "0.15rem 0.45rem", borderRadius: 6,
            }}
          >
            {alert.level}
          </span>
          <span style={{ fontSize: "0.65rem", color: "#A39686", fontWeight: 600 }}>
            via {alert.source}
          </span>
        </div>
        <p style={{ fontSize: "0.86rem", color: "#6B5B49", lineHeight: 1.55 }}>
          {alert.message}
        </p>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { activeFarmId } = useAuthStore();
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFarmAlerts(activeFarmId);
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load alerts");
    } finally {
      setLoading(false);
    }
  }, [activeFarmId]);

  useEffect(() => {
    void load();
  }, [load]);

  const feats = data?.features ?? {};

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          gap: 16, flexWrap: "wrap", marginBottom: "1.5rem",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: "0.72rem", fontWeight: 700, color: "#D9692A",
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
            }}
          >
            <Bell size={12} />
            Smart alerts
          </div>
          <h1
            style={{
              fontSize: "1.75rem", fontWeight: 900, color: "#2C2010",
              letterSpacing: "-0.02em", marginBottom: 6,
            }}
          >
            Watch list
          </h1>
          <p style={{ color: "#A39686", fontSize: "0.9rem", maxWidth: 480 }}>
            Drought, heat, rain, and planting-window signals from live weather plus
            your latest recommendation.
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

      {/* Summary strip */}
      {data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 10,
            marginBottom: "1.25rem",
          }}
        >
          {[
            { label: "Total", value: data.summary.total },
            { label: "Warnings", value: data.summary.warnings },
            { label: "Watches", value: data.summary.watches },
            {
              label: "Rain 7d",
              value: feats.rain_next_7d_mm != null ? `${feats.rain_next_7d_mm} mm` : "—",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "white",
                border: "1px solid #E3DAC9",
                borderRadius: 14,
                padding: "0.85rem 1rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.65rem", fontWeight: 700, color: "#A39686",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#2C2010" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.farm_name && (
        <p style={{ fontSize: "0.8rem", color: "#6B5B49", marginBottom: "1rem" }}>
          {data.farm_name}
          {data.region ? ` · ${data.region.replace("_", " ")}` : ""}
          {data.season ? ` · season ${String(data.season).replace("_", " ")}` : ""}
          {!data.weather_ok && " · weather refresh failed"}
        </p>
      )}

      {loading && !data ? (
        <p style={{ color: "#A39686" }}>Loading alerts…</p>
      ) : data && data.alerts.length === 0 ? (
        <div
          style={{
            background: "white",
            border: "1px solid #E3DAC9",
            borderRadius: 16,
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <Info size={22} color="#4A9661" style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ color: "#6B5B49", fontSize: "0.9rem" }}>
            No active alerts. Conditions look calm — still check Weather before planting.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data?.alerts.map((a, i) => (
            <AlertCard key={`${a.kind}-${i}`} alert={a} />
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex", flexWrap: "wrap", gap: 10, marginTop: "1.75rem",
        }}
      >
        <Link href="/weather">
          <button className="agro-btn-ghost" style={{ fontSize: "0.82rem" }}>
            <CloudRain size={14} />
            Weather
          </button>
        </Link>
        <Link href="/assistant">
          <button className="agro-btn-ghost" style={{ fontSize: "0.82rem" }}>
            <Bot size={14} />
            Ask assistant
          </button>
        </Link>
        <Link href="/recommend">
          <button className="agro-btn" style={{ fontSize: "0.82rem" }}>
            <Sprout size={14} />
            New recommendation
          </button>
        </Link>
      </div>

      {data?.summary.warnings ? (
        <p
          style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            marginTop: "1.25rem", fontSize: "0.8rem", color: "#6B5B49",
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={14} color="#D9692A" style={{ marginTop: 2, flexShrink: 0 }} />
          Act on warnings first — ask the Assistant how to adapt for your recommended crop.
        </p>
      ) : null}
    </div>
  );
}
