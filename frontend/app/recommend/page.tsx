"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Sprout, ChevronRight, ChevronLeft, Leaf,
  Droplets, Thermometer, Wind, FlaskConical,
  CloudRain, MapPin, Check, Loader2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/useAuthStore";
import { getWeatherForecast, type WeatherAlert } from "@/lib/api";

/* ── Types ───────────────────────────────────────────────────────────── */
interface FarmData {
  nitrogen:    string;
  phosphorus:  string;
  potassium:   string;
  ph:          string;
  rainfall:    string;
  temperature: string;
  humidity:    string;
  soil_type:   string;
  season:      string;
  region:      string;
  irrigation:  string;
}

/* ── Step config ─────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: "Soil Nutrients",   icon: FlaskConical },
  { id: 2, label: "Climate Data",     icon: CloudRain    },
  { id: 3, label: "Farm Context",     icon: MapPin       },
];

const SOIL_TYPES = [
  { value: "loamy",    label: "Loamy",    desc: "Best for most crops"         },
  { value: "sandy",    label: "Sandy",    desc: "Drains fast, needs water"    },
  { value: "clay",     label: "Clay",     desc: "Holds water well"            },
  { value: "silty",    label: "Silty",    desc: "Very fertile"                },
  { value: "peaty",    label: "Peaty",    desc: "Acidic, holds moisture"      },
  { value: "saline",   label: "Saline",   desc: "High salt content"           },
  { value: "laterite", label: "Laterite", desc: "Common in East Africa"       },
];

const SEASONS = [
  { value: "long_rains",   label: "Long Rains",    desc: "March – May"          },
  { value: "short_rains",  label: "Short Rains",   desc: "October – December"   },
  { value: "dry",          label: "Dry Season",    desc: "June – September"     },
  { value: "transitional", label: "Transitional",  desc: "Between seasons"      },
];

const REGIONS = [
  { value: "highland",  label: "Highland",  desc: "Above 1500m — cool"       },
  { value: "coastal",   label: "Coastal",   desc: "Near the ocean — humid"   },
  { value: "semi_arid", label: "Semi-Arid", desc: "Low rainfall — dry"       },
  { value: "sub_humid", label: "Sub-Humid", desc: "Moderate rainfall"        },
  { value: "arid",      label: "Arid",      desc: "Very dry — low water"     },
];

/* ── Variants ────────────────────────────────────────────────────────── */
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60, opacity: 0,
  }),
  center: {
    x: 0, opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60, opacity: 0,
    transition: { duration: 0.3 },
  }),
};

/* ── Helper components ───────────────────────────────────────────────── */
function NumberInput({
  label, value, onChange, min, max, step = 1, unit, hint, icon: Icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  min: number; max: number; step?: number; unit: string; hint: string;
  icon: React.ElementType;
}) {
  return (
    <div>
      <label style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: "0.8rem", fontWeight: 700, color: "#A39686",
        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
      }}>
        <Icon size={13} />
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          placeholder={`e.g. ${Math.round((min + max) / 2)}`}
          className="agro-input"
          style={{ paddingRight: "3.5rem" }}
        />
        <span style={{
          position: "absolute", right: "1rem", top: "50%",
          transform: "translateY(-50%)",
          fontSize: "0.75rem", fontWeight: 600, color: "#A39686",
        }}>
          {unit}
        </span>
      </div>
      <p style={{ fontSize: "0.72rem", color: "#A39686", marginTop: 4 }}>
        {hint}
      </p>
    </div>
  );
}

function OptionCard({
  value, label, desc, selected, onClick,
}: {
  value: string; label: string; desc: string;
  selected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: selected
          ? "rgba(229,139,25,0.12)"
          : "rgba(255,255,255,0.5)",
        border: selected
          ? "2px solid #E58B19"
          : "1.5px solid #E3DAC9",
        borderRadius: 12,
        padding: "0.875rem 1rem",
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.2s",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{
            fontWeight: 700, fontSize: "0.9rem",
            color: selected ? "#E58B19" : "#4A3F35",
          }}>
            {label}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#A39686", marginTop: 2 }}>
            {desc}
          </div>
        </div>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "#E58B19",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Check size={13} color="white" />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function RecommendPage() {
  const router = useRouter();
  const [step,      setStep]      = useState(1);
  const [direction, setDirection] = useState(1);
  const [loading,   setLoading]   = useState(false);
  
  // Auth Integration
  const { isAuthenticated, runRecommendation } = useAuthStore();
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);

  const [data, setData] = useState<FarmData>({
    nitrogen: "", phosphorus: "", potassium: "",
    ph: "", rainfall: "", temperature: "", humidity: "",
    soil_type: "", season: "", region: "", irrigation: "",
  });

  const set = (key: keyof FarmData) => (value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const fillFromLiveWeather = async () => {
    setWeatherLoading(true);
    const toastId = toast.loading("Fetching live weather…");
    try {
      let snapshot;
      if (data.region) {
        snapshot = await getWeatherForecast({ region: data.region });
      } else {
        const coords = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
          if (!navigator.geolocation) {
            resolve(null);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
              }),
            () => resolve(null),
            { timeout: 8000 }
          );
        });

        if (coords) {
          snapshot = await getWeatherForecast({
            latitude: coords.lat,
            longitude: coords.lon,
          });
        } else {
          snapshot = await getWeatherForecast({ region: "highland" });
          toast.message("Using highland region defaults — pick your region on the next step for better accuracy.", {
            id: toastId,
          });
        }
      }

      setData((prev) => ({
        ...prev,
        temperature: String(snapshot.suggest_temperature),
        humidity: String(snapshot.suggest_humidity),
        rainfall: String(Math.round(snapshot.suggest_rainfall_mm_year_proxy)),
      }));
      setWeatherAlerts(snapshot.alerts ?? []);
      sessionStorage.setItem(
        "agrosphere_weather",
        JSON.stringify(snapshot)
      );
      toast.success("Climate fields filled from live weather", { id: toastId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not fetch weather",
        { id: toastId }
      );
    } finally {
      setWeatherLoading(false);
    }
  };

  const goNext = () => {
    if (!validateStep()) return;
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!data.nitrogen || !data.phosphorus || !data.potassium || !data.ph) {
        toast.error("Please fill in all soil nutrient values");
        return false;
      }
      const n = +data.nitrogen, p = +data.phosphorus,
            k = +data.potassium, ph = +data.ph;
      if (n < 0 || n > 200) { toast.error("Nitrogen must be 0–200 mg/kg"); return false; }
      if (p < 0 || p > 200) { toast.error("Phosphorus must be 0–200 mg/kg"); return false; }
      if (k < 0 || k > 200) { toast.error("Potassium must be 0–200 mg/kg"); return false; }
      if (ph < 3 || ph > 10) { toast.error("pH must be between 3.0 and 10.0"); return false; }
    }
    if (step === 2) {
      if (!data.rainfall || !data.temperature || !data.humidity) {
        toast.error("Please fill in all climate values");
        return false;
      }
    }
    if (step === 3) {
      if (!data.soil_type || !data.season || !data.region || !data.irrigation) {
        toast.error("Please select all farm context options");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    const toastId = toast.loading("Analyzing your soil nutrients & climate data...");

    try {
      const payload = {
        nitrogen:    parseFloat(data.nitrogen),
        phosphorus:  parseFloat(data.phosphorus),
        potassium:   parseFloat(data.potassium),
        ph:          parseFloat(data.ph),
        rainfall:    parseFloat(data.rainfall),
        temperature: parseFloat(data.temperature),
        humidity:    parseFloat(data.humidity),
        soil_type:   data.soil_type,
        season:      data.season,
        region:      data.region,
        irrigation:  (parseInt(data.irrigation, 10) === 1 ? 1 : 0) as 0 | 1,
        language:    "en",
      };

      const result = await runRecommendation(payload);

      // Save to sessionStorage so results page can read it immediately
      sessionStorage.setItem("agrosphere_result", JSON.stringify(result));
      sessionStorage.setItem("agrosphere_input",  JSON.stringify(payload));

      if (isAuthenticated) {
        toast.success("Analysis complete! Saved to your dashboard history.", { id: toastId });
      } else {
        toast.success("Analysis complete! View recommendation now.", { id: toastId });
      }

      setTimeout(() => router.push("/results"), 850);

    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not reach the server. Make sure the backend is running.";
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / STEPS.length) * 100;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F7F4EB" }}>
      <Navbar />

      <div style={{
        maxWidth: 680, margin: "0 auto",
        padding: "6rem 1.5rem 4rem",
        minHeight: "100vh",
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", marginBottom: "2.5rem" }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg, #E58B19, #F2A63B)",
            display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 1rem",
            boxShadow: "0 8px 24px rgba(229,139,25,0.3)",
          }}>
            <Leaf size={22} color="white" />
          </div>
          <h1 style={{
            fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
            fontWeight: 900, color: "#2C2010",
            letterSpacing: "-0.02em", marginBottom: 8,
          }}>
            Get Your Crop Recommendation
          </h1>
          <p style={{ color: "#A39686", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Enter your farm data in 3 simple steps — takes about 2 minutes
          </p>
        </motion.div>

        {/* Step indicators */}
        <div style={{
          display: "flex", justifyContent: "center",
          gap: 8, marginBottom: "2rem",
        }}>
          {STEPS.map((s) => (
            <motion.div
              key={s.id}
              animate={{
                backgroundColor: step >= s.id ? "#E58B19" : "#E3DAC9",
                scale: step === s.id ? 1.1 : 1,
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0.4rem 1rem",
                borderRadius: 999,
                fontSize: "0.75rem", fontWeight: 700,
                color: step >= s.id ? "white" : "#A39686",
                transition: "all 0.3s",
              }}
            >
              {step > s.id
                ? <Check size={12} />
                : <s.icon size={12} />
              }
              <span className="hidden sm:inline">{s.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{
          height: 3, background: "#E3DAC9",
          borderRadius: 999, marginBottom: "2rem", overflow: "hidden",
        }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: "100%", background: "linear-gradient(90deg, #E58B19, #F2A63B)", borderRadius: 999 }}
          />
        </div>

        {/* Step content */}
        <div style={{
          background: "white",
          border: "1px solid #E3DAC9",
          borderRadius: 20,
          padding: "2rem",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          overflow: "hidden",
          position: "relative",
          minHeight: 380,
        }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >

              {/* ── Step 1: Soil Nutrients ── */}
              {step === 1 && (
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: "1.2rem",
                               color: "#2C2010", marginBottom: 4 }}>
                    Soil Nutrients
                  </h2>
                  <p style={{ color: "#A39686", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                    Get these values from a soil test kit or your local agricultural office.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <NumberInput label="Nitrogen (N)"   value={data.nitrogen}   onChange={set("nitrogen")}
                      min={0} max={200} unit="mg/kg" icon={Sprout}
                      hint="Primary growth nutrient" />
                    <NumberInput label="Phosphorus (P)" value={data.phosphorus} onChange={set("phosphorus")}
                      min={0} max={200} unit="mg/kg" icon={Sprout}
                      hint="Root development" />
                    <NumberInput label="Potassium (K)"  value={data.potassium}  onChange={set("potassium")}
                      min={0} max={200} unit="mg/kg" icon={Sprout}
                      hint="Disease resistance" />
                    <NumberInput label="Soil pH"        value={data.ph}         onChange={set("ph")}
                      min={3} max={10} step={0.1} unit="pH" icon={FlaskConical}
                      hint="Ideal range: 6.0 – 7.0" />
                  </div>
                </div>
              )}

              {/* ── Step 2: Climate ── */}
              {step === 2 && (
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: "1.2rem",
                               color: "#2C2010", marginBottom: 4 }}>
                    Climate Data
                  </h2>
                  <p style={{ color: "#A39686", fontSize: "0.85rem", marginBottom: "1rem" }}>
                    Enter averages for your area, or fill them from live weather.
                  </p>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={weatherLoading}
                    onClick={() => void fillFromLiveWeather()}
                    style={{
                      width: "100%",
                      marginBottom: "1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "0.85rem 1rem",
                      borderRadius: 12,
                      border: "1.5px solid rgba(229,139,25,0.35)",
                      background: "rgba(229,139,25,0.08)",
                      color: "#C56F10",
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      cursor: weatherLoading ? "wait" : "pointer",
                      opacity: weatherLoading ? 0.7 : 1,
                    }}
                  >
                    {weatherLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CloudRain size={16} />
                    )}
                    {weatherLoading ? "Fetching weather…" : "Fill from live weather"}
                  </motion.button>

                  {weatherAlerts.length > 0 && (
                    <div style={{
                      marginBottom: "1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}>
                      {weatherAlerts.map((a, i) => (
                        <div
                          key={`${a.kind}-${i}`}
                          style={{
                            padding: "0.75rem 1rem",
                            borderRadius: 12,
                            border: "1px solid #E3DAC9",
                            background:
                              a.level === "warning"
                                ? "rgba(217,105,42,0.08)"
                                : a.level === "watch"
                                  ? "rgba(229,139,25,0.08)"
                                  : "rgba(74,150,97,0.08)",
                            color: "#2C2010",
                            fontSize: "0.82rem",
                            lineHeight: 1.45,
                          }}
                        >
                          <strong style={{ textTransform: "capitalize" }}>
                            {a.kind.replace("_", " ")}
                          </strong>
                          {" — "}
                          {a.message}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <NumberInput label="Rainfall"    value={data.rainfall}    onChange={set("rainfall")}
                      min={0} max={3000} unit="mm/yr" icon={CloudRain}
                      hint="Annual average rainfall" />
                    <NumberInput label="Temperature" value={data.temperature} onChange={set("temperature")}
                      min={5} max={50} step={0.5} unit="°C" icon={Thermometer}
                      hint="Average daily temperature" />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <NumberInput label="Humidity" value={data.humidity} onChange={set("humidity")}
                        min={10} max={100} unit="%" icon={Droplets}
                        hint="Average relative humidity" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Farm Context ── */}
              {step === 3 && (
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: "1.2rem",
                               color: "#2C2010", marginBottom: 4 }}>
                    Farm Context
                  </h2>
                  <p style={{ color: "#A39686", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                    Select the options that best describe your farm.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Soil type */}
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.8rem", color: "#A39686",
                                  textTransform: "uppercase", letterSpacing: "0.1em",
                                  marginBottom: 8 }}>
                        Soil Type
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {SOIL_TYPES.map((s) => (
                          <OptionCard key={s.value} {...s}
                            selected={data.soil_type === s.value}
                            onClick={() => set("soil_type")(s.value)} />
                        ))}
                      </div>
                    </div>

                    {/* Season */}
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.8rem", color: "#A39686",
                                  textTransform: "uppercase", letterSpacing: "0.1em",
                                  marginBottom: 8 }}>
                        Current Season
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {SEASONS.map((s) => (
                          <OptionCard key={s.value} {...s}
                            selected={data.season === s.value}
                            onClick={() => set("season")(s.value)} />
                        ))}
                      </div>
                    </div>

                    {/* Region */}
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.8rem", color: "#A39686",
                                  textTransform: "uppercase", letterSpacing: "0.1em",
                                  marginBottom: 8 }}>
                        Climate Region
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {REGIONS.map((r) => (
                          <OptionCard key={r.value} {...r}
                            selected={data.region === r.value}
                            onClick={() => set("region")(r.value)} />
                        ))}
                      </div>
                    </div>

                    {/* Irrigation */}
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.8rem", color: "#A39686",
                                  textTransform: "uppercase", letterSpacing: "0.1em",
                                  marginBottom: 8 }}>
                        Irrigation Available?
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <OptionCard value="1" label="Yes" desc="I have irrigation access"
                          selected={data.irrigation === "1"}
                          onClick={() => set("irrigation")("1")} />
                        <OptionCard value="0" label="No" desc="Rain-fed only"
                          selected={data.irrigation === "0"}
                          onClick={() => set("irrigation")("0")} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginTop: "1.5rem",
        }}>
          {step > 1 ? (
            <motion.button
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={goBack}
              className="agro-btn-ghost"
              style={{ padding: "0.75rem 1.5rem" }}
            >
              <ChevronLeft size={16} />
              Back
            </motion.button>
          ) : <div />}

          {step < STEPS.length ? (
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={goNext}
              className="agro-btn"
            >
              Continue
              <ChevronRight size={16} />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading}
              className="agro-btn"
              style={{ minWidth: 180 }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analysing your farm...
                </>
              ) : (
                <>
                  <Sprout size={16} />
                  Get My Recommendation
                  <ChevronRight size={16} />
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* Step counter */}
        <p style={{
          textAlign: "center", marginTop: "1.25rem",
          fontSize: "0.8rem", color: "#A39686",
        }}>
          Step {step} of {STEPS.length}
        </p>

      </div>
    </div>
  );
}