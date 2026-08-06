"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CloudRain, Droplets, Thermometer, AlertTriangle,
  Sprout, RefreshCw, Wind, MapPin,
} from "lucide-react";
import { useAuthStore } from "@/hooks/useAuthStore";
import {
  ensureDefaultFarm,
  getFarm,
  getFarmWeather,
  listFarmWeatherHistory,
  type Farm,
  type WeatherSnapshot,
} from "@/lib/api";
import {
  formatCoords,
  hasConfirmedCoords,
} from "@/lib/location";
import { toast } from "sonner";

export default function WeatherPage() {
  const { activeFarmId, isAuthenticated } = useAuthStore();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [wx, setWx] = useState<WeatherSnapshot | null>(null);
  const [history, setHistory] = useState<
    Array<{ id: string; fetched_at: string; features: Record<string, unknown> }>
  >([]);
  const [loading, setLoading] = useState(true);

  const load = async (refresh = false) => {
    setLoading(true);
    try {
      if (!isAuthenticated) {
        toast.error("Sign in to view farm weather");
        return;
      }

      let farmId = activeFarmId;
      let f: Farm;
      if (farmId) {
        f = await getFarm(farmId);
      } else {
        f = await ensureDefaultFarm("highland");
        farmId = f.id;
        useAuthStore.setState({ activeFarmId: f.id });
      }
      setFarm(f);

      const snapshot = await getFarmWeather(farmId, refresh);
      setWx(snapshot);
      try {
        const hist = await listFarmWeatherHistory(farmId, 8);
        setHistory(hist);
      } catch {
        setHistory([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load weather");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFarmId, isAuthenticated]);

  const confirmed = farm
    ? hasConfirmedCoords(farm.latitude, farm.longitude)
    : false;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", gap: 16, marginBottom: "1.25rem",
                    flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6,
                        fontSize: "0.72rem", fontWeight: 700, color: "#4A9661",
                        textTransform: "uppercase", letterSpacing: "0.1em",
                        marginBottom: 8 }}>
            <CloudRain size={12} />
            Weather intelligence
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#2C2010",
                       letterSpacing: "-0.02em", marginBottom: 6 }}>
            Farm weather
          </h1>
          <p style={{ color: "#A39686", fontSize: "0.9rem", maxWidth: 480 }}>
            Live Open-Meteo forecast for your farm pin. Used to enrich crop recommendations.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="agro-btn-ghost"
            style={{ padding: "0.6rem 1rem", fontSize: "0.82rem" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link href="/recommend">
            <button className="agro-btn" style={{ padding: "0.6rem 1.1rem", fontSize: "0.82rem" }}>
              <Sprout size={14} />
              Use in recommendation
            </button>
          </Link>
        </div>
      </div>

      {/* Location status */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
          padding: "0.9rem 1.1rem", borderRadius: 14, marginBottom: "1.5rem",
          border: confirmed
            ? "1px solid rgba(74,150,97,0.3)"
            : "1px solid rgba(229,139,25,0.35)",
          background: confirmed ? "rgba(74,150,97,0.07)" : "rgba(229,139,25,0.08)",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <MapPin size={16} color={confirmed ? "#4A9661" : "#E58B19"} style={{ marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#2C2010" }}>
              {confirmed ? "Forecast for confirmed farm pin" : "Forecast may be approximate"}
            </div>
            <p style={{ fontSize: "0.78rem", color: "#6B5B49", marginTop: 2 }}>
              {wx
                ? `${formatCoords(wx.latitude, wx.longitude)} · ${farm?.region?.replace("_", " ") ?? "—"}`
                : farm
                  ? `${farm.region.replace("_", " ")} region`
                  : "Loading location…"}
              {!confirmed && " — confirm GPS or map pin for accuracy."}
            </p>
          </div>
        </div>
        <Link href="/location">
          <button className="agro-btn-ghost" style={{ fontSize: "0.78rem", padding: "0.45rem 0.85rem" }}>
            <MapPin size={13} />
            {confirmed ? "Update location" : "Confirm location"}
          </button>
        </Link>
      </div>

      {loading && !wx ? (
        <p style={{ color: "#A39686" }}>Loading forecast…</p>
      ) : wx ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              marginBottom: "1.5rem",
            }}
          >
            {[
              {
                icon: Thermometer,
                label: "Temperature",
                value: `${wx.current.temperature_c}°C`,
                color: "#E58B19",
              },
              {
                icon: Droplets,
                label: "Humidity",
                value: `${wx.current.humidity_pct}%`,
                color: "#4A9661",
              },
              {
                icon: CloudRain,
                label: "Precip now",
                value: `${wx.current.precipitation_mm} mm`,
                color: "#3B82A0",
              },
              {
                icon: Wind,
                label: "Rain next 3d",
                value: `${wx.features?.rain_next_3d_mm ?? "—"} mm`,
                color: "#D9692A",
              },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  background: "white",
                  border: "1px solid #E3DAC9",
                  borderRadius: 16,
                  padding: "1.1rem 1.2rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <c.icon size={14} color={c.color} />
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#A39686",
                                 textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {c.label}
                  </span>
                </div>
                <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#2C2010",
                              fontFamily: "monospace" }}>
                  {c.value}
                </div>
              </div>
            ))}
          </motion.div>

          {wx.cached && (
            <p style={{ fontSize: "0.78rem", color: "#A39686", marginBottom: "1rem" }}>
              Showing cached farm forecast (≤ 1 hour). Hit Refresh for a new pull.
            </p>
          )}

          {(wx.alerts?.length ?? 0) > 0 && (
            <div style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#2C2010", marginBottom: 10 }}>
                Alerts
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {wx.alerts.map((a, i) => (
                  <div
                    key={`${a.kind}-${i}`}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "0.9rem 1rem",
                      borderRadius: 12,
                      border: "1px solid #E3DAC9",
                      background:
                        a.level === "warning"
                          ? "rgba(217,105,42,0.08)"
                          : "rgba(229,139,25,0.06)",
                    }}
                  >
                    <AlertTriangle size={16} color="#E58B19" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#2C2010",
                                    textTransform: "capitalize", marginBottom: 2 }}>
                        {a.kind.replace("_", " ")} · {a.level}
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "#6B5B49", lineHeight: 1.5 }}>
                        {a.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#2C2010", marginBottom: 10 }}>
            7-day forecast
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: 8,
            marginBottom: "2rem",
          }}>
            {wx.daily.map((d) => (
              <div
                key={d.date}
                style={{
                  background: "white",
                  border: "1px solid #E3DAC9",
                  borderRadius: 12,
                  padding: "0.85rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#A39686",
                              marginBottom: 6 }}>
                  {new Date(d.date + "T12:00:00").toLocaleDateString(undefined, {
                    weekday: "short", month: "short", day: "numeric",
                  })}
                </div>
                <div style={{ fontWeight: 900, color: "#2C2010", fontSize: "0.95rem" }}>
                  {Math.round(d.temp_max_c)}° / {Math.round(d.temp_min_c)}°
                </div>
                <div style={{ fontSize: "0.72rem", color: "#3B82A0", marginTop: 4 }}>
                  {d.precipitation_mm} mm
                </div>
              </div>
            ))}
          </div>

          {history.length > 0 && (
            <>
              <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#2C2010", marginBottom: 10 }}>
                Recent pulls
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {history.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      fontSize: "0.78rem", color: "#6B5B49",
                      padding: "0.55rem 0.85rem",
                      background: "white", border: "1px solid #E3DAC9", borderRadius: 10,
                    }}
                  >
                    {new Date(h.fetched_at).toLocaleString()}
                    {h.features?.rain_next_3d_mm != null && (
                      <> · rain 3d {String(h.features.rain_next_3d_mm)} mm</>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <p style={{ color: "#A39686" }}>No forecast loaded.</p>
      )}
    </div>
  );
}
