"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Leaf, Sprout, BarChart3, ArrowRight,
  TrendingUp, Brain, Clock, Plus, ChevronRight, Sun, CloudRain, MapPin,
} from "lucide-react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { getFarm, getFarmWeather, type WeatherAlert } from "@/lib/api";
import { hasConfirmedCoords } from "@/lib/location";

/* ── Animation variants ──────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

/* ── Page ───────────────────────────────────────────────────────────── */
export default function HubPage() {
  const router = useRouter();
  const { isAuthenticated, user, history, loadHistory, activeFarmId } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [weatherSummary, setWeatherSummary] = useState<string | null>(null);
  const [locationOk, setLocationOk] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/auth");
    }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      void loadHistory();
    }
  }, [mounted, isAuthenticated, loadHistory]);

  useEffect(() => {
    if (!mounted || !isAuthenticated || !activeFarmId) return;
    let cancelled = false;
    (async () => {
      try {
        const farm = await getFarm(activeFarmId);
        if (cancelled) return;
        setLocationOk(hasConfirmedCoords(farm.latitude, farm.longitude));
      } catch {
        /* optional */
      }
      try {
        const wx = await getFarmWeather(activeFarmId);
        if (cancelled) return;
        setWeatherAlerts(wx.alerts ?? []);
        const rain3 = wx.features?.rain_next_3d_mm;
        setWeatherSummary(
          `${wx.current.temperature_c}°C · ${wx.current.humidity_pct}% humidity` +
            (rain3 != null ? ` · ${rain3} mm rain (3d)` : "")
        );
      } catch {
        /* weather is optional on hub */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, isAuthenticated, activeFarmId]);

  if (!mounted || !isAuthenticated) return null;

  const analysisCount = history.length;
  const lastCrop = history.length > 0 ? history[0].top_crop : null;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F7F4EB" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

        {/* Greeting header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{ marginBottom: "3rem" }}
        >
          <motion.div variants={fadeUp} style={{ marginBottom: 8 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: "0.75rem", fontWeight: 700,
              color: "#E58B19", textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}>
              <Sun size={12} />
              {greeting()}
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 900,
              color: "#2C2010",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            Welcome, {user?.username}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            style={{ color: "#A39686", fontSize: "1rem", lineHeight: 1.6 }}
          >
            {analysisCount === 0
              ? "You haven't run any crop analyses yet. Let's get started!"
              : `You have ${analysisCount} analysis record${analysisCount !== 1 ? "s" : ""}. What would you like to do?`
            }
          </motion.p>
        </motion.div>

        {(weatherSummary || weatherAlerts.length > 0 || locationOk === false) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "white",
              border: "1px solid #E3DAC9",
              borderRadius: 16,
              padding: "1rem 1.25rem",
              marginBottom: "1.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CloudRain size={15} color="#4A9661" />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4A9661",
                               textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Farm weather
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {locationOk === false && (
                  <Link href="/location">
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#C56F10",
                                   display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={12} /> Confirm location
                    </span>
                  </Link>
                )}
                <Link href="/weather">
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#A39686" }}>
                    Details →
                  </span>
                </Link>
              </div>
            </div>
            {locationOk === false && (
              <p style={{ fontSize: "0.8rem", color: "#6B5B49", marginBottom: weatherSummary ? 8 : 0 }}>
                Weather is using a region estimate until you confirm your farm pin.
              </p>
            )}
            {weatherSummary && (
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#2C2010", marginBottom: weatherAlerts.length ? 8 : 0 }}>
                {weatherSummary}
              </p>
            )}
            {weatherAlerts.slice(0, 2).map((a, i) => (
              <p key={`${a.kind}-${i}`} style={{ fontSize: "0.8rem", color: "#6B5B49", lineHeight: 1.45, marginTop: 4 }}>
                <strong style={{ textTransform: "capitalize" }}>{a.kind.replace("_", " ")}</strong>
                {" — "}
                {a.message}
              </p>
            ))}
          </motion.div>
        )}

        {/* Action cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
            marginBottom: "3rem",
          }}
        >
          {/* Get Recommendation Card */}
          <motion.div variants={fadeUp}>
            <Link href="/recommend" style={{ textDecoration: "none" }}>
              <motion.div
                whileHover={{ y: -6, borderColor: "#E58B19" }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: "white",
                  border: "2px solid #E3DAC9",
                  borderRadius: 24,
                  padding: "2.5rem 2rem",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  position: "relative",
                  overflow: "hidden",
                  height: "100%",
                }}
              >
                {/* Glow */}
                <div style={{
                  position: "absolute", top: -40, right: -40,
                  width: 160, height: 160, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(229,139,25,0.1) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />

                <div style={{ position: "relative", zIndex: 1 }}>
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    style={{
                      width: 60, height: 60, borderRadius: 20,
                      background: "linear-gradient(135deg, #E58B19, #F2A63B)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: "1.5rem",
                      boxShadow: "0 8px 24px rgba(229,139,25,0.3)",
                    }}
                  >
                    <Sprout size={28} color="white" />
                  </motion.div>

                  <h2 style={{
                    fontSize: "1.35rem", fontWeight: 900,
                    color: "#2C2010", marginBottom: 8,
                    letterSpacing: "-0.01em",
                  }}>
                    Get Crop Recommendation
                  </h2>

                  <p style={{
                    color: "#A39686", fontSize: "0.875rem",
                    lineHeight: 1.6, marginBottom: "1.5rem",
                  }}>
                    Enter your soil nutrients, climate data, and farm context to receive
                    AI-powered crop recommendations tailored to your field.
                  </p>

                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    color: "#E58B19", fontWeight: 700, fontSize: "0.875rem",
                  }}>
                    Start Analysis
                    <ArrowRight size={15} />
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* Dashboard Card */}
          <motion.div variants={fadeUp}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <motion.div
                whileHover={{ y: -6, borderColor: "#4A9661" }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: "white",
                  border: "2px solid #E3DAC9",
                  borderRadius: 24,
                  padding: "2.5rem 2rem",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  position: "relative",
                  overflow: "hidden",
                  height: "100%",
                }}
              >
                {/* Glow */}
                <div style={{
                  position: "absolute", top: -40, right: -40,
                  width: 160, height: 160, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(74,150,97,0.1) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />

                <div style={{ position: "relative", zIndex: 1 }}>
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity }}
                    style={{
                      width: 60, height: 60, borderRadius: 20,
                      background: "linear-gradient(135deg, #4A9661, #6AB87A)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: "1.5rem",
                      boxShadow: "0 8px 24px rgba(74,150,97,0.3)",
                    }}
                  >
                    <BarChart3 size={28} color="white" />
                  </motion.div>

                  <h2 style={{
                    fontSize: "1.35rem", fontWeight: 900,
                    color: "#2C2010", marginBottom: 8,
                    letterSpacing: "-0.01em",
                  }}>
                    Farm Dashboard
                  </h2>

                  <p style={{
                    color: "#A39686", fontSize: "0.875rem",
                    lineHeight: 1.6, marginBottom: "1.5rem",
                  }}>
                    View your analysis history, track soil fertility trends,
                    compare seasonal records, and monitor drought risk alerts.
                  </p>

                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    color: "#4A9661", fontWeight: 700, fontSize: "0.875rem",
                  }}>
                    Open Dashboard
                    <ArrowRight size={15} />
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Quick stats strip */}
        {analysisCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              background: "white",
              border: "1px solid #E3DAC9",
              borderRadius: 20,
              padding: "1.5rem 2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "rgba(229,139,25,0.08)",
                border: "1px solid rgba(229,139,25,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Clock size={18} color="#E58B19" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#2C2010" }}>
                  Latest: <span style={{ textTransform: "capitalize" }}>{lastCrop}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#A39686", marginTop: 2 }}>
                  {analysisCount} total analysis record{analysisCount !== 1 ? "s" : ""} saved
                </div>
              </div>
            </div>

            <Link href="/recommend">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="agro-btn"
                style={{ padding: "0.6rem 1.2rem", fontSize: "0.82rem" }}
              >
                <Plus size={14} />
                New Analysis
                <ChevronRight size={14} />
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* Bottom tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: "2.5rem",
            padding: "1.25rem 1.5rem",
            background: "rgba(229,139,25,0.06)",
            border: "1px solid rgba(229,139,25,0.15)",
            borderRadius: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <Brain size={18} color="#E58B19" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#2C2010", marginBottom: 4 }}>
              Pro Tip
            </div>
            <p style={{ fontSize: "0.82rem", color: "#6B5B49", lineHeight: 1.6 }}>
              Run soil analyses at the start of each season for the same fields to track how your
              soil health changes over time. Your dashboard will automatically chart these trends.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
