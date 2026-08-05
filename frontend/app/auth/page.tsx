"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Leaf, Mail, Lock, User, ArrowRight, Eye, EyeOff,
  Sprout, CheckCircle, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/useAuthStore";

/* ── Animation variants ──────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, transition: { duration: 0.25 } }),
};

/* ── Page ───────────────────────────────────────────────────────────── */
export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, login, register } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [direction, setDirection] = useState(1);

  // Login form
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register form
  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If already authenticated, redirect to hub
  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.push("/hub");
    }
  }, [mounted, isAuthenticated, router]);

  const switchMode = (target: "login" | "register") => {
    setDirection(target === "register" ? 1 : -1);
    setMode(target);
  };

  const handleLogin = () => {
    if (!loginUser.trim() || !loginPass) {
      toast.error("Please fill in all fields");
      return;
    }
    const result = login(loginUser, loginPass);
    // console.log(result);
    if (result.success) {
      toast.success(result.message);
      router.push("/hub");
    } else {
      toast.error(result.message);
    }
  };

  const handleRegister = () => {
    if (!regUser.trim() || !regEmail.trim() || !regPass) {
      toast.error("Please fill in all fields");
      return;
    }
    if (regPass.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    const result = register(regUser, regEmail, regPass);
    if (result.success) {
      toast.success(result.message);
      router.push("/hub");
    } else {
      toast.error(result.message);
    }
  };

  if (!mounted) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background: "linear-gradient(135deg, #1A1108 0%, #2C1E0E 40%, #1A1108 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background effects */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 700, height: 500, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(229,139,25,0.2) 0%, transparent 70%)",
          filter: "blur(80px)",
          top: "20%", left: "50%", transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      />

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.6 }}
          style={{
            position: "absolute",
            width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2,
            borderRadius: "50%",
            background: i % 2 === 0 ? "#E58B19" : "#4A9661",
            top: `${15 + i * 15}%`, left: `${10 + i * 18}%`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={{
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: 460,
          background: "rgba(253,251,247,0.97)",
          borderRadius: 28,
          boxShadow: "0 30px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(229,139,25,0.15)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "2.5rem 2.5rem 0", textAlign: "center" }}>
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 18,
              background: "linear-gradient(135deg, #E58B19, #F2A63B)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
              boxShadow: "0 8px 24px rgba(229,139,25,0.35)",
            }}>
              <Leaf size={24} color="white" />
            </div>
          </motion.div>

          <h1 style={{
            fontSize: "1.6rem", fontWeight: 900,
            color: "#2C2010", letterSpacing: "-0.02em",
            marginBottom: 4,
          }}>
            {mode === "login" ? "Welcome Back" : "Join AgroSphere"}
          </h1>
          <p style={{ color: "#A39686", fontSize: "0.875rem", lineHeight: 1.5 }}>
            {mode === "login"
              ? "Sign in to access your farm dashboard and history"
              : "Create your free account to start growing smarter"
            }
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex", margin: "1.5rem 2.5rem 0",
          background: "#F0EBE0", borderRadius: 14,
          padding: 4,
        }}>
          {(["login", "register"] as const).map((tab) => (
            <motion.button
              key={tab}
              onClick={() => switchMode(tab)}
              style={{
                flex: 1, padding: "0.65rem",
                borderRadius: 11, border: "none",
                fontSize: "0.85rem", fontWeight: 700,
                cursor: "pointer",
                background: mode === tab ? "white" : "transparent",
                color: mode === tab ? "#2C2010" : "#A39686",
                boxShadow: mode === tab ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.25s",
              }}
            >
              {tab === "login" ? "Sign In" : "Register"}
            </motion.button>
          ))}
        </div>

        {/* Form area */}
        <div style={{ padding: "1.5rem 2.5rem 2.5rem", minHeight: 300 }}>
          <AnimatePresence mode="wait" custom={direction}>
            {mode === "login" ? (
              <motion.div
                key="login"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {/* Username */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    fontSize: "0.75rem", fontWeight: 700, color: "#A39686",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    display: "block", marginBottom: 6
                  }}>
                    Username
                  </label>
                  <div style={{ position: "relative" }}>
                    <User size={16} color="#A39686" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="text"
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      placeholder="Enter your username"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      style={{
                        width: "100%", padding: "0.8rem 0.8rem 0.8rem 2.75rem",
                        border: "1.5px solid #E3DAC9", borderRadius: 14,
                        fontSize: "0.9rem", color: "#2C2010",
                        background: "#FDFBF7",
                        outline: "none", transition: "border-color 0.2s",
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{
                    fontSize: "0.75rem", fontWeight: 700, color: "#A39686",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    display: "block", marginBottom: 6
                  }}>
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} color="#A39686" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type={showLoginPass ? "text" : "password"}
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="Enter your password"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      style={{
                        width: "100%", padding: "0.8rem 2.75rem 0.8rem 2.75rem",
                        border: "1.5px solid #E3DAC9", borderRadius: 14,
                        fontSize: "0.9rem", color: "#2C2010",
                        background: "#FDFBF7",
                        outline: "none", transition: "border-color 0.2s",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      style={{
                        position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", padding: 0
                      }}
                    >
                      {showLoginPass ? <EyeOff size={16} color="#A39686" /> : <Eye size={16} color="#A39686" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogin}
                  className="agro-btn"
                  style={{ width: "100%", padding: "0.9rem", fontSize: "0.95rem", justifyContent: "center" }}
                >
                  Sign In
                  <ArrowRight size={16} />
                </motion.button>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.82rem", color: "#A39686" }}>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => switchMode("register")}
                    style={{
                      color: "#E58B19", fontWeight: 700, background: "none",
                      border: "none", cursor: "pointer", textDecoration: "underline"
                    }}
                  >
                    Register here
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {/* Username */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{
                    fontSize: "0.75rem", fontWeight: 700, color: "#A39686",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    display: "block", marginBottom: 6
                  }}>
                    Username
                  </label>
                  <div style={{ position: "relative" }}>
                    <User size={16} color="#A39686" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="text"
                      value={regUser}
                      onChange={(e) => setRegUser(e.target.value)}
                      placeholder="Choose a username"
                      style={{
                        width: "100%", padding: "0.8rem 0.8rem 0.8rem 2.75rem",
                        border: "1.5px solid #E3DAC9", borderRadius: 14,
                        fontSize: "0.9rem", color: "#2C2010",
                        background: "#FDFBF7", outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{
                    fontSize: "0.75rem", fontWeight: 700, color: "#A39686",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    display: "block", marginBottom: 6
                  }}>
                    Email
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} color="#A39686" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="your@email.com"
                      style={{
                        width: "100%", padding: "0.8rem 0.8rem 0.8rem 2.75rem",
                        border: "1.5px solid #E3DAC9", borderRadius: 14,
                        fontSize: "0.9rem", color: "#2C2010",
                        background: "#FDFBF7", outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    fontSize: "0.75rem", fontWeight: 700, color: "#A39686",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    display: "block", marginBottom: 6
                  }}>
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} color="#A39686" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type={showRegPass ? "text" : "password"}
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      placeholder="Minimum 6 characters"
                      onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                      style={{
                        width: "100%", padding: "0.8rem 2.75rem 0.8rem 2.75rem",
                        border: "1.5px solid #E3DAC9", borderRadius: 14,
                        fontSize: "0.9rem", color: "#2C2010",
                        background: "#FDFBF7", outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPass(!showRegPass)}
                      style={{
                        position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", padding: 0
                      }}
                    >
                      {showRegPass ? <EyeOff size={16} color="#A39686" /> : <Eye size={16} color="#A39686" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRegister}
                  className="agro-btn"
                  style={{ width: "100%", padding: "0.9rem", fontSize: "0.95rem", justifyContent: "center" }}
                >
                  Create Account
                  <ArrowRight size={16} />
                </motion.button>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.82rem", color: "#A39686" }}>
                  Already have an account?{" "}
                  <button
                    onClick={() => switchMode("login")}
                    style={{
                      color: "#E58B19", fontWeight: 700, background: "none",
                      border: "none", cursor: "pointer", textDecoration: "underline"
                    }}
                  >
                    Sign in
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{
          padding: "1rem 2.5rem 1.5rem",
          borderTop: "1px solid #E3DAC9",
          background: "#FBF8F0",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "0.72rem", color: "#C4B5A0", lineHeight: 1.5 }}>
            By continuing, you agree to AgroSphere&apos;s Terms of Service.
            <br />Your data stays on this device — no cloud storage.
          </p>
        </div>
      </motion.div>

      {/* Back to home link */}
      <motion.a
        href="/"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          position: "absolute", bottom: "2rem",
          color: "#EFEAD8", fontSize: "0.82rem",
          display: "flex", alignItems: "center", gap: 6,
          textDecoration: "none", opacity: 0.7,
        }}
      >
        <Leaf size={13} color="#E58B19" />
        Back to AgroSphere Home
      </motion.a>
    </div>
  );
}
