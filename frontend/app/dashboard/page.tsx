"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Leaf, Plus, TrendingUp, Droplets, Sun,
  Brain, Clock, ChevronRight, BarChart3,
  Sprout, AlertTriangle, CheckCircle, Lock,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useAuthStore, HistoryEntry } from "@/hooks/useAuthStore";

/* ── Helpers ─────────────────────────────────────────────────────────── */
const CROP_EMOJIS: Record<string, string> = {
  maize: "🌽", rice: "🌾", wheat: "🌾", sorghum: "🌾", millet: "🌾",
  beans: "🫘", coffee: "☕", tea: "🍵", banana: "🍌", cassava: "🥔",
  potato: "🥔", tomato: "🍅", cotton: "🌿", sugarcane: "🎋",
  mango: "🥭", papaya: "🍈", groundnut: "🥜", sweetpotato: "🍠",
  coconut: "🥥", lentils: "🫘", chickpea: "🫘", default: "🌱",
};

const getCropEmoji = (crop: string) =>
  CROP_EMOJIS[crop?.toLowerCase()] || CROP_EMOJIS.default;

const getDroughtColor = (risk: string) => ({
  low:      "#4A9661",
  moderate: "#E58B19",
  high:     "#D9692A",
  critical: "#C0392B",
}[risk] || "#A39686");

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

/* ── Animation variants ──────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

/* ── Demo data — shown blurred in guest teaser background ─────────────── */
const DEMO_HISTORY: Omit<HistoryEntry, "explanation" | "tips" | "climate_warning" | "nitrogen" | "phosphorus" | "potassium" | "ph" | "rainfall" | "temperature" | "humidity" | "soil_type" | "irrigation">[] = [
  {
    id: "demo1",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    top_crop: "maize",
    confidence_pct: "90%",
    drought_risk: "moderate",
    soil_fertility_score: 0.45,
    region: "highland",
    season: "long_rains",
  },
  {
    id: "demo2",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    top_crop: "mango",
    confidence_pct: "58%",
    drought_risk: "high",
    soil_fertility_score: 0.32,
    region: "arid",
    season: "dry",
  },
  {
    id: "demo3",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    top_crop: "banana",
    confidence_pct: "70%",
    drought_risk: "moderate",
    soil_fertility_score: 0.58,
    region: "coastal",
    season: "long_rains",
  },
];

/* ── Stat card ───────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string;
  value: string; sub: string; color: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      style={{
        background: "white",
        border: "1px solid #E3DAC9",
        borderRadius: 16,
        padding: "1.25rem 1.5rem",
        transition: "all 0.3s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700,
                       color: "#A39686", textTransform: "uppercase",
                       letterSpacing: "0.1em" }}>
          {label}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 900, color: "#2C2010",
                    fontFamily: "monospace", lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: "0.78rem", color: "#A39686" }}>{sub}</div>
    </motion.div>
  );
}

/* ── History row ─────────────────────────────────────────────────────── */
function HistoryRow({ entry }: { entry: any }) {
  const fertility = Math.round(entry.soil_fertility_score * 100);

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ x: 4, borderColor: "#E58B19" }}
      style={{
        background: "white",
        border: "1.5px solid #E3DAC9",
        borderRadius: 14,
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: 16,
        transition: "all 0.25s",
        cursor: "default",
      }}
    >
      {/* Emoji */}
      <div style={{ fontSize: "2rem", flexShrink: 0, lineHeight: 1 }}>
        {getCropEmoji(entry.top_crop)}
      </div>

      {/* Crop info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center",
                      gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: "1rem",
                         color: "#2C2010", textTransform: "capitalize" }}>
            {entry.top_crop}
          </span>
          <span style={{
            fontSize: "0.7rem", fontWeight: 700,
            color: "#E58B19", background: "rgba(229,139,25,0.1)",
            border: "1px solid rgba(229,139,25,0.2)",
            padding: "0.15rem 0.5rem", borderRadius: 999,
          }}>
            {entry.confidence_pct} suitability
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center",
                      gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", color: "#A39686",
                         display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={10} />
            {formatTime(entry.timestamp)}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#A39686",
                         textTransform: "capitalize" }}>
            {entry.region?.replace("_", " ")} · {entry.season?.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Scores */}
      <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#A39686",
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        marginBottom: 2 }}>
            Fertility
          </div>
          <div style={{ fontWeight: 800, fontSize: "0.95rem",
                        color: fertility >= 60 ? "#4A9661" :
                               fertility >= 40 ? "#E58B19" : "#D9692A",
                        fontFamily: "monospace" }}>
            {fertility}%
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#A39686",
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        marginBottom: 2 }}>
            Drought
          </div>
          <div style={{ fontWeight: 800, fontSize: "0.95rem",
                        color: getDroughtColor(entry.drought_risk),
                        textTransform: "capitalize", fontFamily: "monospace" }}>
            {entry.drought_risk}
          </div>
        </div>
      </div>

      <ChevronRight size={16} color="#C4B5A0" style={{ flexShrink: 0 }} />
    </motion.div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  
  // Auth Store Connections
  const { isAuthenticated, getHistory, user, setShowLoginModal, setShowRegisterModal } = useAuthStore();
  
  const history = mounted && isAuthenticated ? getHistory() : DEMO_HISTORY;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stats computed from history
  const avgFertility = history.length
    ? Math.round(history.reduce((a, h) => a + h.soil_fertility_score, 0) / history.length * 100)
    : 0;

  const topCropCount = history.reduce((acc, h) => {
    if (h.top_crop) {
      acc[h.top_crop] = (acc[h.top_crop] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const mostCommonCrop = Object.entries(topCropCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const highRiskCount = history.filter(
    (h) => h.drought_risk === "high" || h.drought_risk === "critical"
  ).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F7F4EB" }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "6rem 1.5rem 4rem", position: "relative" }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", flexWrap: "wrap",
            gap: 16, marginBottom: "2.5rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center",
                          gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "linear-gradient(135deg, #E58B19, #F2A63B)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(229,139,25,0.3)",
              }}>
                <Leaf size={18} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 900,
                             color: "#2C2010", letterSpacing: "-0.02em",
                             lineHeight: 1 }}>
                  Farm Dashboard
                </h1>
                {mounted && isAuthenticated ? (
                  <p style={{ fontSize: "0.82rem", color: "#A39686", marginTop: 2 }}>
                    Welcome back, <strong>{user?.username}</strong> — Persistent records
                  </p>
                ) : (
                  <p style={{ fontSize: "0.82rem", color: "#A39686", marginTop: 2 }}>
                    Your crop analysis history and farm insights
                  </p>
                )}
              </div>
            </div>
          </div>

          <Link href={mounted && isAuthenticated ? "/recommend" : "#"}>
            <motion.button
              whileHover={mounted && isAuthenticated ? { scale: 1.04, y: -1 } : {}}
              whileTap={mounted && isAuthenticated ? { scale: 0.97 } : {}}
              onClick={() => {
                if (mounted && !isAuthenticated) {
                  setShowLoginModal(true);
                }
              }}
              className="agro-btn"
              style={{ padding: "0.7rem 1.4rem", fontSize: "0.875rem" }}
            >
              <Plus size={15} />
              New Analysis
            </motion.button>
          </Link>
        </motion.div>

        {/* Outer container wrapping metrics and logs (blurs when logged out) */}
        <div className={`transition-all duration-700 ${mounted && !isAuthenticated ? "filter blur-[8px] pointer-events-none select-none" : ""}`}>
          
          {/* Stats grid */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12, marginBottom: "2.5rem",
            }}
          >
            <StatCard
              icon={BarChart3} label="Analyses Run"
              value={`${history.length}`}
              sub="Total recommendations"
              color="#E58B19"
            />
            <StatCard
              icon={Sun} label="Avg Soil Fertility"
              value={`${avgFertility}%`}
              sub="Across all analyses"
              color="#4A9661"
            />
            <StatCard
              icon={Sprout} label="Top Crop"
              value={getCropEmoji(mostCommonCrop)}
              sub={mostCommonCrop.replace("_", " ")}
              color="#E58B19"
            />
            <StatCard
              icon={AlertTriangle} label="High Risk Alerts"
              value={`${highRiskCount}`}
              sub="Drought risk flags"
              color="#D9692A"
            />
          </motion.div>

          {/* Real history Empty State */}
          {mounted && isAuthenticated && history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "white",
                border: "1px solid #E3DAC9",
                borderRadius: 20,
                padding: "4rem 2rem",
                textAlign: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: 20,
                background: "rgba(229,139,25,0.08)",
                border: "1px solid rgba(229,139,25,0.2)",
                display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 1.25rem",
              }}>
                <Sprout size={28} className="text-agro-amber" />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#2C2010", marginBottom: 8 }}>
                No Crop Analyses Found
              </h3>
              <p style={{ color: "#A39686", fontSize: "0.875rem", maxWidth: 400, margin: "0 auto 2rem", lineHeight: 1.6 }}>
                You haven&apos;t run any crop recommendations yet. Enter your soil chemistry values and current climate to record your first field recommendation!
              </p>
              <Link href="/recommend">
                <motion.button
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="agro-btn px-6 py-3"
                >
                  <Plus size={16} />
                  Analyse Your Soil Now
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            /* History table */
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#2C2010" }}>
                  Analysis History
                </h2>
                <span style={{ fontSize: "0.75rem", color: "#A39686" }}>
                  {history.length} record{history.length !== 1 ? "s" : ""}
                </span>
              </div>

              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {history.map((entry, i) => (
                  <HistoryRow key={entry.id} entry={entry} index={i} />
                ))}
              </motion.div>
            </div>
          )}

          {/* Bottom fresh analysis prompt card */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                marginTop: "2.5rem",
                background: "white",
                border: "1px solid #E3DAC9",
                borderRadius: 20,
                padding: "2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: "rgba(74,150,97,0.1)",
                  border: "1px solid rgba(74,150,97,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <TrendingUp size={20} color="#4A9661" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem",
                                color: "#2C2010" }}>
                    Analyse another farm
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#A39686", marginTop: 2 }}>
                    Get a fresh recommendation with new data
                  </div>
                </div>
              </div>
              <Link href="/recommend">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="agro-btn"
                  style={{ padding: "0.65rem 1.25rem", fontSize: "0.85rem" }}
                >
                  <Sprout size={14} />
                  New Analysis
                  <ChevronRight size={14} />
                </motion.button>
              </Link>
            </motion.div>
          )}
        </div>

        {/* ── GUEST BLOCKING WALL OVERLAY ─────────────────────────── */}
        {mounted && !isAuthenticated && (
          <div 
            className="absolute inset-x-4 top-[120px] bottom-0 flex items-center justify-center z-30"
            style={{ minHeight: "450px" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              style={{ 
                background: "rgba(253, 251, 247, 0.96)", 
                border: "1px solid rgba(229, 139, 25, 0.25)", 
                boxShadow: "0 30px 60px rgba(44, 32, 16, 0.25)" 
              }}
              className="max-w-[460px] w-full p-8 md:p-10 rounded-3xl text-center backdrop-blur-xl border border-agro-border"
            >
              <div 
                style={{ background: "rgba(229,139,25,0.08)", border: "1px solid rgba(229,139,25,0.2)" }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              >
                <Lock size={24} className="text-agro-amber" />
              </div>
              
              <h2 className="text-2xl font-black text-agro-text tracking-tight mb-3">
                Unlock Your Farm Dashboard
              </h2>
              
              <p className="text-[0.875rem] text-agro-muted leading-relaxed mb-6">
                AgroSphere accounts are completely free. Sign in or register in seconds to store persistent crop history, compare seasonal test records, and track soil fertility stats for your different fields.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowLoginModal(true)}
                  className="agro-btn-ghost py-3 px-6 justify-center"
                >
                  Sign In
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowRegisterModal(true)}
                  className="agro-btn py-3 px-6 justify-center"
                >
                  Create Free Account
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
}