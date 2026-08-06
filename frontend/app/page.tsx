"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  Leaf, CloudRain, TrendingUp, Shield, ArrowRight,
  Sprout, Sun, Droplets, Brain, BarChart3, Wind,
  CheckCircle2, Zap, MapPin, Star,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useAuthStore } from "@/hooks/useAuthStore";

/* ── Animated counter hook ──────────────────────────────────────────── */
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref               = useRef<HTMLDivElement>(null);
  const inView            = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start     = 0;
    const step    = target / (duration / 16);
    const timer   = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return { count, ref };
}

/* ── 3D tilt card hook ───────────────────────────────────────────────── */
function useTilt() {
  const ref  = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sX   = useSpring(rotX, { stiffness: 300, damping: 30 });
  const sY   = useSpring(rotY, { stiffness: 300, damping: 30 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el   = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x    = (e.clientX - rect.left) / rect.width  - 0.5;
    const y    = (e.clientY - rect.top)  / rect.height - 0.5;
    rotX.set(-y * 10);
    rotY.set( x * 10);
  };

  const onLeave = () => { rotX.set(0); rotY.set(0); };

  return { ref, sX, sY, onMove, onLeave };
}

/* ── Animation variants ─────────────────────────────────────────────── */
const up = {
  hidden: { opacity: 0, y: 48 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const wordReveal = {
  hidden: { opacity: 0, y: 20, rotateX: -20 },
  show: {
    opacity: 1, y: 0, rotateX: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ── Data ───────────────────────────────────────────────────────────── */
const STATS = [
  { target: 35,   suffix: "",  label: "Crop Varieties",     icon: Sprout },
  { target: 99,   suffix: "%", label: "Model Accuracy",     icon: Brain },
  { target: 12,   suffix: "",  label: "Farm Parameters",    icon: BarChart3 },
  { target: 6920, suffix: "+", label: "Training Records",   icon: CheckCircle2 },
];

const FEATURES = [
  { icon: Sprout,     color: "#4A9661", title: "Soil Intelligence",   desc: "Deep analysis of nitrogen, phosphorus, potassium, and pH levels to precisely match crops to your soil chemistry." },
  { icon: CloudRain,  color: "#5B9BD5", title: "Climate Awareness",   desc: "Rainfall, temperature, humidity, and seasonal patterns — all factored into every single recommendation." },
  { icon: Brain,      color: "#E58B19", title: "AI Explanation",      desc: "Plain-English explanations of why each crop suits your farm. No jargon, just clear guidance you can act on." },
  { icon: Shield,     color: "#D9692A", title: "Risk Intelligence",   desc: "Drought risk scores and early climate warnings so you can protect your harvest before problems arise." },
  { icon: Wind,       color: "#9B6FD4", title: "Season Guidance",     desc: "Adapts to long rains, short rains, dry season, and transitional periods across East and West Africa." },
  { icon: TrendingUp, color: "#E05555", title: "Confidence Scores",   desc: "Every recommendation comes with a confidence percentage so you know exactly how strong each crop match is." },
];

const HOW = [
  { step: "01", title: "Enter Your Farm Data",        time: "2 minutes",        desc: "Input soil nutrients (N, P, K), pH, rainfall, temperature, humidity, soil type, season, and region." },
  { step: "02", title: "Three AI Models Analyse",     time: "Under 1 second",   desc: "Random Forest, XGBoost, and LightGBM all analyse your farm data simultaneously and vote on the best crops." },
  { step: "03", title: "Get Your Recommendation",     time: "Instant results",  desc: "Ranked crops with confidence scores, a plain-English AI explanation, practical tips, and climate warnings." },
];

const CROPS = ["Maize","Rice","Wheat","Sorghum","Millet","Beans","Coffee","Tea","Banana","Cassava","Potato","Tomato","Cotton","Sugarcane","Mango","Papaya","Groundnut","Sweetpotato"];

const REGIONS = [
  { name: "Eldoret",      region: "Highland",  flag: "🌾" },
  { name: "Kerugoya",     region: "Sub-humid", flag: "☕" },
  { name: "Taita Taveta", region: "Semi-arid", flag: "🌵" },
  { name: "Kisumu",       region: "Lakeside",  flag: "🌿" },
  { name: "Mombasa",      region: "Coastal",   flag: "🥥" },
  { name: "Nairobi",      region: "Highland",  flag: "🍅" },
];

/* ── Page ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, bootstrapped } = useAuthStore();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY    = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const heroFade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    if (bootstrapped && isAuthenticated) {
      router.replace("/hub");
    }
  }, [bootstrapped, isAuthenticated, router]);

  /* Word-by-word headline */
  const headline1 = ["Farm", "Smarter."];
  const headline2 = ["Grow", "Better."];

  if (bootstrapped && isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#F7F4EB" }}>
        <p style={{ color: "#A39686", fontSize: "0.9rem" }}>Opening your farm…</p>
      </main>
    );
  }

  return (
    <main
      style={{ width: "100vw", overflowX: "hidden", backgroundColor: "#1A1108", backgroundImage: "url('/bg-hero.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}
      className="min-h-screen text-[#FDFBF7]"
    >
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        style={{ width: "100vw", minHeight: "100vh", position: "relative",
                 display: "flex", alignItems: "center", justifyContent: "center",
                 padding: "6rem 1.5rem 4rem",
}}
      >
        {/* Overlay & Animated Sun Glow */}
        <motion.div
          style={{ y: heroY, opacity: heroFade }}
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
        >
          {/* Dark Overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(26,17,8,0.3) 0%, rgba(26,17,8,0.95) 100%)"
          }} />

          {/* Animated Sun Glow */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: "800px", height: "600px", borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(242,166,59,0.35) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
        </motion.div>

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y:       [0, -30, 0],
              opacity: [0.6, 1, 0.6],
              scale:   [1, 1.2, 1],
            }}
            transition={{
              duration:   4 + i * 1.2,
              repeat:     Infinity,
              delay:      i * 0.8,
              ease:       "easeInOut",
            }}
            style={{
              position:  "absolute",
              width:     4 + (i % 3) * 2,
              height:    4 + (i % 3) * 2,
              borderRadius: "50%",
              background: i % 2 === 0 ? "#E58B19" : "#4A9661",
              top:   `${20 + i * 12}%`,
              left:  `${8 + i * 14}%`,
              filter: "blur(0.5px)",
            }}
          />
        ))}

        {/* Hero content */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{ position: "relative", zIndex: 10, maxWidth: 900,
                   width: "100%", textAlign: "center" }}
        >
          {/* Badge */}
          <motion.div variants={up} style={{ marginBottom: "2rem" }}>
            <span className="agro-tag agro-tag-amber">
              <span style={{ width: 6, height: 6, borderRadius: "50%",
                             background: "#E58B19",
                             animation: "pulse 2s infinite" }} />
              AI-Powered Agricultural Intelligence
            </span>
          </motion.div>

          {/* Headline line 1 — word by word */}
          <div style={{ overflow: "hidden", marginBottom: "0.25rem", perspective: 800 }}>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              style={{ display: "flex", justifyContent: "center",
                       gap: "0.4em", flexWrap: "wrap" }}
            >
              {headline1.map((word, i) => (
                <motion.span
                  key={i}
                  variants={wordReveal}
                  style={{
                    fontSize: "clamp(3rem, 9vw, 6.5rem)",
                    fontWeight: 900,
                    lineHeight: 1.0,
                    letterSpacing: "-0.03em",
                    color: "#FFFFFF",
                    display: "inline-block",
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Headline line 2 — gradient */}
          <div style={{ overflow: "hidden", marginBottom: "1.75rem", perspective: 800 }}>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              style={{ display: "flex", justifyContent: "center",
                       gap: "0.4em", flexWrap: "wrap" }}
            >
              {headline2.map((word, i) => (
                <motion.span
                  key={i}
                  variants={wordReveal}
                  className="text-gradient-amber"
                  style={{
                    fontSize: "clamp(3rem, 9vw, 6.5rem)",
                    fontWeight: 900,
                    lineHeight: 1.0,
                    letterSpacing: "-0.03em",
                    display: "inline-block",
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Sub */}
          <motion.p
            variants={up}
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              color: "#EFEAD8",
              maxWidth: 580,
              margin: "0 auto 2.5rem",
              lineHeight: 1.75,
            }}
          >
            AgroSphere analyses your soil and climate conditions to recommend
            the most suitable crops for your farm — powered by three AI models
            trained on African agricultural data.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={up}
            style={{ display: "flex", gap: 14, justifyContent: "center",
                     flexWrap: "wrap", marginBottom: "4rem" }}
          >
            <Link href="/auth">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="agro-btn"
                style={{ fontSize: "1rem", padding: "0.9rem 2rem" }}
              >
                <Sprout size={18} />
                Get Your Crop Recommendation
                <ArrowRight size={16} />
              </motion.button>
            </Link>
            <a href="#how-it-works">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="agro-btn-ghost"
                style={{ fontSize: "1rem", padding: "0.9rem 2rem" }}
              >
                See How It Works
              </motion.button>
            </a>
          </motion.div>

          {/* Stats — animated counters */}
          <motion.div variants={up}>
            <StatGrid />
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          style={{
            position: "absolute", bottom: "2rem", left: "50%",
            transform: "translateX(-50%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 8,
          }}
        >
          <span className="agro-label" style={{ color: "#EFEAD8" }}>scroll</span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ width: 1, height: 40,
                     background: "linear-gradient(to bottom, #E58B19, transparent)" }}
          />
        </motion.div>
      </section>

      {/* ── CROPS TICKER ──────────────────────────────────────────── */}
      <div style={{
        width: "100vw", overflow: "hidden",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(26,17,8,0.9)", backdropFilter: "blur(10px)",
        padding: "1rem 0",
      }}>
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ display: "flex", gap: "2.5rem", whiteSpace: "nowrap" }}
        >
          {[...CROPS, ...CROPS].map((crop, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex", alignItems: "center",
                gap: 8, flexShrink: 0,
                fontSize: "0.8rem", fontWeight: 600,
                color: "#EFEAD8", letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <Leaf size={11} color="#E58B19" />
              {crop}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section style={{ width: "100vw", padding: "7rem 1.5rem", background: "rgba(26,17,8,0.85)", backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.div variants={up} style={{ textAlign: "center", marginBottom: "4rem" }}>
              <p className="agro-label" style={{ marginBottom: 14 }}>
                What AgroSphere Does
              </p>
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900,
                           lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                Every factor that matters.
                <br />
                <span className="text-gradient-amber">Analysed together.</span>
              </h2>
              <p style={{ color: "#EFEAD8", marginTop: 16, maxWidth: 520,
                          margin: "1rem auto 0", lineHeight: 1.7 }}>
                From soil chemistry to seasonal climate — AgroSphere considers
                everything that affects what grows on your farm.
              </p>
            </motion.div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}>
              {FEATURES.map((f, i) => (
                <TiltCard key={f.title} feature={f} index={i} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── REGIONS ───────────────────────────────────────────────── */}
      <section style={{ width: "100vw", padding: "5rem 1.5rem",
                        background: "rgba(26,17,8,0.9)", backdropFilter: "blur(10px)",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <motion.div variants={up} style={{ textAlign: "center", marginBottom: "3rem" }}>
              <p className="agro-label" style={{ marginBottom: 12 }}>Built for East Africa</p>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900,
                           letterSpacing: "-0.02em" }}>
                From Mombasa to Eldoret.
                <br />
                <span style={{ color: "#E58B19" }}>Every region. Every season.</span>
              </h2>
            </motion.div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}>
              {REGIONS.map((r, i) => (
                <motion.div
                  key={r.name}
                  variants={up}
                  whileHover={{ y: -4, borderColor: "rgba(229,139,25,0.6)" }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 16,
                    padding: "1.5rem",
                    display: "flex", alignItems: "center", gap: 14,
                    transition: "all 0.3s",
                    cursor: "default",
                  }}
                >
                  <span style={{ fontSize: "2rem" }}>{r.flag}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#EFEAD8",
                                  display: "flex", alignItems: "center", gap: 4,
                                  marginTop: 2 }}>
                      <MapPin size={10} color="#E58B19" />
                      {r.region}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section id="how-it-works" style={{ width: "100vw", padding: "7rem 1.5rem", background: "rgba(26,17,8,0.85)", backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.div variants={up} style={{ textAlign: "center", marginBottom: "4rem" }}>
              <p className="agro-label" style={{ marginBottom: 14 }}>Simple Process</p>
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900,
                           lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                Soil data in.
                <br />
                <span className="text-gradient-amber">Crop decision out.</span>
              </h2>
            </motion.div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {HOW.map((step, i) => (
                <motion.div
                  key={step.step}
                  variants={up}
                  whileHover={{ x: 6 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 18,
                    padding: "2rem 2.5rem",
                    display: "flex", gap: 24,
                    alignItems: "flex-start",
                    cursor: "default",
                    transition: "border-color 0.3s",
                  }}
                  onHoverStart={(e) => {
                    (e.target as HTMLElement).style.borderColor = "rgba(229,139,25,0.3)";
                  }}
                  onHoverEnd={(e) => {
                    (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                >
                  <div style={{
                    fontSize: "3.5rem", fontWeight: 900,
                    color: "rgba(229,139,25,0.15)",
                    fontFamily: "DM Mono, monospace",
                    lineHeight: 1, minWidth: 60,
                  }}>
                    {step.step}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center",
                                  gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                      <h3 style={{ fontWeight: 800, fontSize: "1.15rem" }}>
                        {step.title}
                      </h3>
                      <span className="agro-tag agro-tag-amber" style={{ fontSize: "0.65rem" }}>
                        <Zap size={9} />
                        {step.time}
                      </span>
                    </div>
                    <p style={{ color: "#EFEAD8", lineHeight: 1.7, fontSize: "0.95rem" }}>
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────────── */}
      <section style={{ width: "100vw", padding: "5rem 1.5rem",
                        background: "rgba(26,17,8,0.9)", backdropFilter: "blur(10px)",
                        borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <div style={{ display: "flex", justifyContent: "center",
                          gap: 4, marginBottom: "1.5rem" }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="#E58B19" color="#E58B19" />
              ))}
            </div>
            <blockquote style={{
              fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
              fontWeight: 700, lineHeight: 1.5,
              color: "#FFFFFF", maxWidth: 700, margin: "0 auto 1.5rem",
              fontStyle: "italic",
            }}>
              &ldquo;A tool that finally speaks the language of African soil
              and African seasons. This is what precision agriculture
              looks like for our continent.&rdquo;
            </blockquote>
            <p style={{ color: "#EFEAD8", fontSize: "0.9rem", fontWeight: 600 }}>
              Agricultural Research Advisor — Kenya
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section style={{ width: "100vw", padding: "7rem 1.5rem", background: "rgba(26,17,8,0.85)", backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            style={{
              background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 28,
              padding: "5rem 2rem",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Glow inside */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 500, height: 300, borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(229,139,25,0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ marginBottom: "1.5rem" }}
              >
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: "rgba(229,139,25,0.12)",
                  border: "1px solid rgba(229,139,25,0.2)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", margin: "0 auto",
                }}>
                  <Leaf size={32} color="#E58B19" />
                </div>
              </motion.div>

              <h2 style={{
                fontSize: "clamp(2rem, 5vw, 3rem)",
                fontWeight: 900, marginBottom: "1rem",
                letterSpacing: "-0.02em",
              }}>
                Ready to grow smarter?
              </h2>
              <p style={{ color: "#EFEAD8", marginBottom: "2.5rem",
                          lineHeight: 1.7, maxWidth: 480, margin: "0 auto 2.5rem" }}>
                Join farmers across East Africa making better crop decisions
                with AI-powered recommendations built for African soil and climate.
              </p>
              <Link href="/auth">
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="agro-btn"
                  style={{ fontSize: "1.05rem", padding: "1rem 2.5rem",
                           boxShadow: "0 0 40px rgba(229,139,25,0.25)" }}
                >
                  <Sprout size={19} />
                  Get Started — It&apos;s Free
                  <ArrowRight size={17} />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{
        width: "100vw",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "3rem 1.5rem",
        background: "rgba(20,12,6,0.95)", backdropFilter: "blur(15px)"
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", flexWrap: "wrap",
          alignItems: "center", justifyContent: "space-between", gap: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, #E58B19, #F2A63B)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Leaf size={14} color="#F7F4EB" />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1rem" }}>AgroSphere</span>
            <span style={{ color: "#EFEAD8", fontSize: "0.875rem" }}>
              — AI Crop Intelligence
            </span>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[
              { icon: Sun,      color: "#E58B19", text: "Built for African farmers" },
              { icon: Droplets, color: "#4A9661", text: "35 crop varieties" },
              { icon: Brain,    color: "#E58B19", text: "3 AI models" },
            ].map(({ icon: Icon, color, text }) => (
              <span key={text} style={{
                display: "flex", alignItems: "center",
                gap: 6, fontSize: "0.85rem", color: "#EFEAD8",
              }}>
                <Icon size={13} color={color} />
                {text}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ── Stat grid with animated counters ───────────────────────────────── */
function StatGrid() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 1,
      background: "rgba(255,255,255,0.1)",
      borderRadius: 20,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.15)",
      boxShadow: "0 0 60px rgba(0,0,0,0.5)",
      backdropFilter: "blur(12px)",
    }}>
      {STATS.map((stat) => {
        const { count, ref } = useCounter(stat.target);
        return (
          <motion.div
            key={stat.label}
            ref={ref}
            whileHover={{ background: "rgba(255,255,255,0.1)" }}
            style={{
              background: "rgba(0,0,0,0.4)",
              padding: "1.5rem 1rem",
              textAlign: "center",
              transition: "background 0.3s",
            }}
          >
            <stat.icon size={16} color="#E58B19"
                       style={{ margin: "0 auto 8px", opacity: 0.7 }} />
            <div style={{
              fontFamily: "DM Mono, monospace",
              fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
              fontWeight: 700,
              color: "#E58B19",
              lineHeight: 1,
              marginBottom: 6,
            }}>
              {count}{stat.suffix}
            </div>
            <div className="agro-label">{stat.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── 3D tilt feature card ───────────────────────────────────────────── */
function TiltCard({ feature: f, index }: { feature: typeof FEATURES[0]; index: number }) {
  const { ref, sX, sY, onMove, onLeave } = useTilt();

  return (
    <motion.div
      variants={up}
      custom={index}
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: sX,
        rotateY: sY,
        transformStyle: "preserve-3d",
        perspective: 800,
      }}
    >
      <motion.div
        whileHover={{ borderColor: `${f.color}35` }}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "1.75rem",
          height: "100%",
          transition: "border-color 0.3s",
          cursor: "default",
        }}
      >
        <motion.div
          whileHover={{ scale: 1.1, rotate: 6 }}
          transition={{ type: "spring", stiffness: 300 }}
          style={{
            width: 46, height: 46, borderRadius: 14,
            background: `${f.color}15`,
            border: `1px solid ${f.color}25`,
            display: "flex", alignItems: "center",
            justifyContent: "center", marginBottom: 18,
          }}
        >
          <f.icon size={21} color={f.color} />
        </motion.div>
        <h3 style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: 10 }}>
          {f.title}
        </h3>
        <p style={{ fontSize: "0.875rem", color: "#EFEAD8", lineHeight: 1.7 }}>
          {f.desc}
        </p>
      </motion.div>
    </motion.div>
  );
}