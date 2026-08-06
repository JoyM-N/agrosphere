"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Leaf, ArrowLeft, Sprout, Droplets, AlertTriangle,
  CheckCircle, TrendingUp, ChevronRight, RotateCcw,
  Sun, Brain, CloudRain,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/hooks/useAuthStore";

/* ── Types ───────────────────────────────────────────────────────────── */
interface CropResult {
  rank: number;
  crop: string;
  confidence: number;
  confidence_pct: string;
  confidence_label: string;
  is_primary: boolean;
}

interface RecommendationResponse {
  top_crop: string;
  recommendations: CropResult[];
  soil_fertility_score: number;
  drought_risk: string;
  model_version: string;
  explanation: string;
  tips: string[];
  climate_warning: string;
  weather?: {
    source?: string;
    fetched_at?: string;
    latitude?: number;
    longitude?: number;
    features?: {
      rain_next_3d_mm?: number;
      rain_next_7d_mm?: number;
      temp_max_3d_c?: number;
      temp_avg_3d_c?: number;
      current_humidity_pct?: number;
      rainfall_annual_proxy_mm?: number;
      alert_kinds?: string[];
    };
    alerts?: Array<{ level: string; kind: string; message: string }>;
    climate_before?: {
      temperature?: number;
      humidity?: number;
      rainfall?: number;
    };
    climate_after?: {
      temperature?: number;
      humidity?: number;
      rainfall?: number;
    };
    overwrite_climate?: boolean;
    error?: string;
  } | null;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
const CROP_EMOJIS: Record<string, string> = {
  maize: "🌽", rice: "🌾", wheat: "🌾", sorghum: "🌾", millet: "🌾",
  beans: "🫘", coffee: "☕", tea: "🍵", banana: "🍌", cassava: "🥔",
  potato: "🥔", tomato: "🍅", cotton: "🌿", sugarcane: "🎋",
  mango: "🥭", papaya: "🍈", groundnut: "🥜", sweetpotato: "🍠",
  coconut: "🥥", lentils: "🫘", chickpea: "🫘",
  default: "🌱",
};

const getCropEmoji = (crop: string) =>
  CROP_EMOJIS[crop.toLowerCase()] || CROP_EMOJIS.default;

const getDroughtColor = (risk: string) => ({
  low:      "#4A9661",
  moderate: "#E58B19",
  high:     "#D9692A",
  critical: "#C0392B",
}[risk] || "#A39686");

const getDroughtLabel = (risk: string) => ({
  low:      "Low Risk",
  moderate: "Moderate Risk",
  high:     "High Risk",
  critical: "Critical Risk",
}[risk] || risk);

const getFertilityLabel = (score: number) => {
  if (score >= 0.7) return { label: "Excellent", color: "#4A9661" };
  if (score >= 0.5) return { label: "Good",      color: "#E58B19" };
  if (score >= 0.3) return { label: "Moderate",  color: "#D9692A" };
  return                   { label: "Poor",       color: "#C0392B" };
};

/* ── Page ────────────────────────────────────────────────────────────── */
export default function ResultsPage() {
  const router  = useRouter();
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  
  // Auth Store
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem("agrosphere_result");
    if (!stored) { router.push("/recommend"); return; }
    const parsed = JSON.parse(stored) as RecommendationResponse;
    // Fallback: merge autofill weather snapshot if recommend response lacked weather block
    if (!parsed.weather) {
      const wx = sessionStorage.getItem("agrosphere_weather");
      if (wx) {
        try {
          const snap = JSON.parse(wx);
          parsed.weather = {
            source: snap.source,
            fetched_at: snap.fetched_at,
            latitude: snap.latitude,
            longitude: snap.longitude,
            features: snap.features,
            alerts: snap.alerts,
          };
        } catch { /* ignore */ }
      }
    }
    setResult(parsed);
    setLoaded(true);
  }, [router]);

  if (!loaded || !result) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F7F4EB",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ display: "inline-block", marginBottom: 12 }}
        >
          <Leaf size={32} color="#E58B19" />
        </motion.div>
        <p style={{ color: "#A39686" }}>Loading your recommendation...</p>
      </div>
    </div>
  );

  const primary      = result.recommendations[0];
  const alternatives = result.recommendations.slice(1, 3);
  const fertility    = getFertilityLabel(result.soil_fertility_score);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F7F4EB" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ marginBottom: "2rem" }}
        >
          <Link href="/recommend">
            <button className="agro-btn-ghost"
                    style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              <ArrowLeft size={14} />
              New Analysis
            </button>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: "2rem", textAlign: "center" }}
        >
          <span className="agro-tag agro-tag-green" style={{ marginBottom: 12, display: "inline-flex" }}>
            <CheckCircle size={11} />
            Analysis Complete
          </span>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 900,
                       color: "#2C2010", letterSpacing: "-0.02em" }}>
            Your Crop Recommendation
          </h1>
        </motion.div>

        {/* Guest account teaser banner */}
        {mounted && !isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              background: "rgba(229,139,25,0.08)",
              border: "1px solid rgba(229,139,25,0.25)",
              borderRadius: 18,
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <h4 style={{ fontWeight: 800, color: "#2C2010", fontSize: "0.95rem", marginBottom: 2 }}>
                🌱 Guest Mode Active
              </h4>
              <p style={{ fontSize: "0.82rem", color: "#6B5B49", lineHeight: 1.5 }}>
                This crop analysis is only saved temporarily. Log in or create an account to archive this matching history to your private dashboard.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="text-xs font-semibold text-agro-amber bg-agro-amber/10 border border-agro-amber/20 px-3 py-1.5 rounded-xl cursor-default animate-pulse">
                Unsaved Result
              </span>
            </div>
          </motion.div>
        )}

        {/* Authenticated Confirmation Banner */}
        {mounted && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "rgba(74,150,97,0.08)",
              border: "1px solid rgba(74,150,97,0.25)",
              borderRadius: 18,
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <h4 style={{ fontWeight: 800, color: "#2C2010", fontSize: "0.95rem", marginBottom: 2 }}>
                ✅ Recommendation Archived
              </h4>
              <p style={{ fontSize: "0.82rem", color: "#4A5F4E", lineHeight: 1.5 }}>
                This analysis has been successfully saved to your persistent farm dashboard. You can access it anytime under your records.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── PRIMARY RECOMMENDATION ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: "white",
            border: "2px solid #E58B19",
            borderRadius: 24,
            overflow: "hidden",
            marginBottom: "1.5rem",
            boxShadow: "0 8px 40px rgba(229,139,25,0.15)",
          }}
        >
          {/* Primary header */}
          <div style={{
            background: "linear-gradient(135deg, #E58B19, #F2A63B)",
            padding: "1.25rem 1.75rem",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800,
                             color: "rgba(255,255,255,0.85)", textTransform: "uppercase",
                             letterSpacing: "0.1em" }}>
                ★ Best Match
              </span>
            </div>
            <span style={{ fontSize: "0.85rem", fontWeight: 700,
                           color: "rgba(255,255,255,0.9)",
                           background: "rgba(255,255,255,0.2)",
                           padding: "0.25rem 0.75rem", borderRadius: 999 }}>
              {primary.confidence_label} Confidence
            </span>
          </div>

          <div style={{ padding: "2rem" }}>
            {/* Crop name + emoji */}
            <div style={{ display: "flex", alignItems: "center",
                          gap: 20, marginBottom: "1.5rem" }}>
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ fontSize: "4.5rem", lineHeight: 1 }}
              >
                {getCropEmoji(primary.crop)}
              </motion.div>
              <div>
                <h2 style={{ fontSize: "2.2rem", fontWeight: 900,
                             color: "#2C2010", textTransform: "capitalize",
                             letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {primary.crop}
                </h2>
                <div style={{ display: "flex", alignItems: "center",
                              gap: 8, marginTop: 6 }}>
                  <div style={{ height: 6, width: 120, background: "#E3DAC9",
                                borderRadius: 999, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${primary.confidence * 100}%` }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      style={{ height: "100%",
                               background: "linear-gradient(90deg, #E58B19, #F2A63B)",
                               borderRadius: 999 }}
                    />
                  </div>
                  <span style={{ fontWeight: 800, color: "#E58B19",
                                 fontSize: "1.1rem", fontFamily: "monospace" }}>
                    {primary.confidence_pct}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Explanation */}
            <div style={{
              background: "#FDF9F0",
              border: "1px solid #F2E4C8",
              borderRadius: 14,
              padding: "1.25rem",
              marginBottom: "1.5rem",
            }}>
              <div style={{ display: "flex", alignItems: "center",
                            gap: 8, marginBottom: 8 }}>
                <Brain size={15} color="#E58B19" />
                <span style={{ fontSize: "0.75rem", fontWeight: 700,
                               color: "#E58B19", textTransform: "uppercase",
                               letterSpacing: "0.08em" }}>
                  AI Explanation
                </span>
              </div>
              <p style={{ color: "#4A3F35", lineHeight: 1.7,
                          fontSize: "0.95rem" }}>
                {result.explanation}
              </p>
            </div>

            {/* Tips */}
            {result.tips.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#A39686",
                            textTransform: "uppercase", letterSpacing: "0.1em",
                            marginBottom: 10 }}>
                  Farming Tips
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.tips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      style={{ display: "flex", alignItems: "flex-start",
                               gap: 10 }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: "rgba(74,150,97,0.12)",
                        border: "1px solid rgba(74,150,97,0.25)",
                        display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0, marginTop: 1,
                      }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 800,
                                       color: "#4A9661" }}>
                          {i + 1}
                        </span>
                      </div>
                      <p style={{ color: "#4A3F35", fontSize: "0.9rem",
                                  lineHeight: 1.6 }}>
                        {tip}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Climate warning */}
            {result.climate_warning && (
              <div style={{
                background: "rgba(229,139,25,0.08)",
                border: "1px solid rgba(229,139,25,0.2)",
                borderRadius: 12, padding: "1rem",
                display: "flex", gap: 10, alignItems: "flex-start",
                marginBottom: result.weather ? "1.25rem" : 0,
              }}>
                <AlertTriangle size={16} color="#E58B19"
                               style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: "#4A3F35", fontSize: "0.875rem",
                            lineHeight: 1.6 }}>
                  <strong>Climate Note:</strong> {result.climate_warning}
                </p>
              </div>
            )}

            {/* Live weather influence (Phase 2) */}
            {result.weather && !result.weather.error && (
              <div style={{
                background: "rgba(74,150,97,0.06)",
                border: "1px solid rgba(74,150,97,0.2)",
                borderRadius: 14,
                padding: "1.15rem 1.25rem",
              }}>
                <div style={{ display: "flex", alignItems: "center",
                              gap: 8, marginBottom: 10 }}>
                  <CloudRain size={15} color="#4A9661" />
                  <span style={{ fontSize: "0.75rem", fontWeight: 700,
                                 color: "#4A9661", textTransform: "uppercase",
                                 letterSpacing: "0.08em" }}>
                    Live weather used in this recommendation
                  </span>
                </div>

                {result.weather.overwrite_climate && result.weather.climate_before && result.weather.climate_after && (
                  <p style={{ fontSize: "0.82rem", color: "#4A3F35",
                              lineHeight: 1.55, marginBottom: 12 }}>
                    Climate inputs were updated from Open-Meteo before the model ran
                    (temp {result.weather.climate_before.temperature}°C → {result.weather.climate_after.temperature}°C,
                    {" "}humidity {result.weather.climate_before.humidity}% → {result.weather.climate_after.humidity}%,
                    {" "}rainfall {result.weather.climate_before.rainfall} → {result.weather.climate_after.rainfall} mm/yr proxy).
                  </p>
                )}

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                  gap: 8,
                  marginBottom: (result.weather.alerts?.length ?? 0) > 0 ? 12 : 0,
                }}>
                  {[
                    {
                      label: "Rain (3d)",
                      value: result.weather.features?.rain_next_3d_mm != null
                        ? `${result.weather.features.rain_next_3d_mm} mm`
                        : "—",
                    },
                    {
                      label: "Rain (7d)",
                      value: result.weather.features?.rain_next_7d_mm != null
                        ? `${result.weather.features.rain_next_7d_mm} mm`
                        : "—",
                    },
                    {
                      label: "Max temp",
                      value: result.weather.features?.temp_max_3d_c != null
                        ? `${result.weather.features.temp_max_3d_c}°C`
                        : "—",
                    },
                    {
                      label: "Humidity",
                      value: result.weather.features?.current_humidity_pct != null
                        ? `${result.weather.features.current_humidity_pct}%`
                        : "—",
                    },
                  ].map((item) => (
                    <div key={item.label} style={{
                      background: "white",
                      border: "1px solid #E3DAC9",
                      borderRadius: 10,
                      padding: "0.65rem 0.75rem",
                    }}>
                      <div style={{ fontSize: "0.65rem", fontWeight: 700,
                                    color: "#A39686", textTransform: "uppercase",
                                    letterSpacing: "0.06em", marginBottom: 4 }}>
                        {item.label}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem",
                                    color: "#2C2010", fontFamily: "monospace" }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                {(result.weather.alerts?.length ?? 0) > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {result.weather.alerts!.slice(0, 3).map((a, i) => (
                      <div key={`${a.kind}-${i}`} style={{
                        fontSize: "0.8rem",
                        color: "#4A3F35",
                        lineHeight: 1.45,
                        padding: "0.55rem 0.7rem",
                        borderRadius: 8,
                        background: a.level === "warning"
                          ? "rgba(217,105,42,0.1)"
                          : "rgba(229,139,25,0.08)",
                      }}>
                        <strong style={{ textTransform: "capitalize" }}>
                          {a.kind.replace("_", " ")}
                        </strong>
                        {" — "}
                        {a.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── SOIL & RISK SCORES ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 12, marginBottom: "1.5rem",
          }}
        >
          <div style={{
            background: "white", border: "1px solid #E3DAC9",
            borderRadius: 16, padding: "1.25rem",
          }}>
            <div style={{ display: "flex", alignItems: "center",
                          gap: 6, marginBottom: 8 }}>
              <Sun size={14} color="#E58B19" />
              <span style={{ fontSize: "0.72rem", fontWeight: 700,
                             color: "#A39686", textTransform: "uppercase",
                             letterSpacing: "0.1em" }}>
                Soil Fertility
              </span>
            </div>
            <div style={{ fontWeight: 900, fontSize: "1.8rem",
                          color: fertility.color, fontFamily: "monospace",
                          lineHeight: 1, marginBottom: 4 }}>
              {Math.round(result.soil_fertility_score * 100)}%
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600,
                          color: fertility.color }}>
              {fertility.label}
            </div>
          </div>

          <div style={{
            background: "white", border: "1px solid #E3DAC9",
            borderRadius: 16, padding: "1.25rem",
          }}>
            <div style={{ display: "flex", alignItems: "center",
                          gap: 6, marginBottom: 8 }}>
              <Droplets size={14} color={getDroughtColor(result.drought_risk)} />
              <span style={{ fontSize: "0.72rem", fontWeight: 700,
                             color: "#A39686", textTransform: "uppercase",
                             letterSpacing: "0.1em" }}>
                Drought Risk
              </span>
            </div>
            <div style={{ fontWeight: 900, fontSize: "1.8rem",
                          color: getDroughtColor(result.drought_risk),
                          fontFamily: "monospace", lineHeight: 1,
                          textTransform: "capitalize", marginBottom: 4 }}>
              {result.drought_risk}
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600,
                          color: getDroughtColor(result.drought_risk) }}>
              {getDroughtLabel(result.drought_risk)}
            </div>
          </div>
        </motion.div>

        {/* ── ALTERNATIVE CROPS ── */}
        {alternatives.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#A39686",
                        textTransform: "uppercase", letterSpacing: "0.1em",
                        marginBottom: 10 }}>
              Other Good Options For Your Farm
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {alternatives.map((alt, i) => (
                <motion.div
                  key={alt.crop}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  whileHover={{ y: -3, borderColor: "#E58B19" }}
                  style={{
                    background: "white",
                    border: "1.5px solid #E3DAC9",
                    borderRadius: 16, padding: "1.25rem",
                    transition: "all 0.25s",
                    cursor: "default",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>
                    {getCropEmoji(alt.crop)}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem",
                                color: "#2C2010", textTransform: "capitalize",
                                marginBottom: 4 }}>
                    {alt.crop}
                  </div>
                  <div style={{ display: "flex", alignItems: "center",
                                gap: 6 }}>
                    <div style={{ height: 4, flex: 1, background: "#E3DAC9",
                                  borderRadius: 999, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${alt.confidence * 100}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                        style={{ height: "100%", background: "#E58B19",
                                 borderRadius: 999 }}
                      />
                    </div>
                    <span style={{ fontWeight: 700, color: "#E58B19",
                                   fontSize: "0.85rem", fontFamily: "monospace" }}>
                      {alt.confidence_pct}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#A39686",
                                marginTop: 4 }}>
                    {alt.confidence_label} match
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── ACTIONS ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ display: "flex", gap: 12, marginTop: "2rem",
                   justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link href="/recommend">
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="agro-btn-ghost"
            >
              <RotateCcw size={15} />
              Analyse Another Farm
            </motion.button>
          </Link>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.print()}
            className="agro-btn"
          >
            <TrendingUp size={15} />
            Save Results
            <ChevronRight size={15} />
          </motion.button>
        </motion.div>

        {/* Model version */}
        <p style={{ textAlign: "center", marginTop: "2rem",
                    fontSize: "0.72rem", color: "#C4B5A0" }}>
          Powered by AgroSphere Intelligence Engine v{result.model_version}
          &nbsp;·&nbsp;3 AI models &nbsp;·&nbsp; 35 crop varieties
        </p>
      </div>
    </div>
  );
}