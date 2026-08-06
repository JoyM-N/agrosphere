"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Leaf, Sprout, ChevronRight, LogIn, UserPlus, LogOut, User } from "lucide-react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";



export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  // Auth & Global Modals state from Zustand
  const {
    isAuthenticated, user, login, register, logout,
    showLoginModal: showLogin, showRegisterModal: showRegister,
    setShowLoginModal: setShowLogin, setShowRegisterModal: setShowRegister
  } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Forms state
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  useEffect(() => {
    setMounted(true);
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);


  // Marketing nav only — logged-in users use the app sidebar (no Home there)
  const guestLinks = [
    { label: "Home", href: "/" },
    { label: "How It Works", href: "/#how-it-works" },
  ];
  const links = mounted && isAuthenticated ? [] : guestLinks;
  const brandHref = mounted && isAuthenticated ? "/hub" : "/";

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass) {
      toast.error("Please fill in all fields.");
      return;
    }
    const res = await login(loginUser, loginPass);
    if (res.success) {
      toast.success(res.message);
      setShowLogin(false);
      setLoginUser("");
      setLoginPass("");
      router.push("/hub");
    } else {
      toast.error(res.message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUser.trim() || !regEmail.trim() || !regPass) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (regPass.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    const res = await register(regUser, regEmail, regPass);
    if (res.success) {
      toast.success(res.message);
      setShowRegister(false);
      setRegUser("");
      setRegEmail("");
      setRegPass("");
      router.push("/hub");
    } else {
      toast.error(res.message);
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ width: "100vw", left: 0, right: 0 }}
        className={`fixed top-0 z-40 transition-all duration-500 ${scrolled
          ? "border-b border-agro-border/60 backdrop-blur-2xl shadow-2xl shadow-black/30"
          : ""
          }`}
      >
        {/* Warm blur background on scroll */}
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: scrolled
              ? "rgba(247,244,235,0.92)"
              : "transparent",
          }}
        />

        <div className="relative z-10 w-full px-6 md:px-10 h-[68px]
                        flex items-center justify-between max-w-[1400px] mx-auto">

          {/* Logo */}
          <Link href={brandHref} className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br
                         from-agro-amber to-agro-amber2
                         flex items-center justify-center shadow-lg"
              style={{ boxShadow: "0 4px 20px rgba(229,139,25,0.35)" }}
            >
              <Leaf size={17} className="text-agro-bg" />
            </motion.div>
            <span className="font-extrabold text-[1.15rem] tracking-tight text-agro-text">
              Agro<span className="text-agro-amber">Sphere</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[0.875rem] font-medium text-agro-muted
                           hover:text-agro-text transition-colors duration-200
                           relative group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px]
                                 bg-agro-amber rounded-full
                                 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          {/* CTA / Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {mounted && isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/hub"
                  className="agro-btn agro-btn-sm flex items-center gap-1.5"
                >
                  Open app
                  <ChevronRight size={13} />
                </Link>
                <div style={{ background: "rgba(229,139,25,0.08)", border: "1px solid rgba(229,139,25,0.2)" }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-agro-amber flex items-center justify-center text-xs font-bold text-agro-bg uppercase">
                    {user?.username[0]}
                  </div>
                  <span className="text-[0.875rem] font-semibold text-agro-text">
                    {user?.username}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    void logout().then(() => {
                      toast.success("Successfully logged out.");
                      router.push("/");
                    });
                  }}
                  className="agro-btn-ghost agro-btn-sm flex items-center gap-1.5"
                >
                  <LogOut size={13} />
                  Log Out
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { router.push('/auth'); }}
                  className="agro-btn-ghost agro-btn-sm flex items-center gap-1.5"
                >
                  <LogIn size={13} />
                  Log In
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    router.push('/auth');
                  }}
                  className="agro-btn agro-btn-sm flex items-center gap-1.5"
                >
                  <UserPlus size={13} />
                  Register
                </motion.button>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(!open)}
            className="md:hidden w-9 h-9 rounded-xl border border-agro-border
                       flex items-center justify-center text-agro-muted
                       hover:text-agro-text hover:border-agro-amber/40
                       transition-colors"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={open ? "x" : "menu"}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.15 }}
              >
                {open ? <X size={16} /> : <Menu size={16} />}
              </motion.div>
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="md:hidden border-t border-agro-border/60
                         backdrop-blur-2xl relative z-10"
              style={{ background: "rgba(247,244,235,0.97)" }}
            >
              <div className="px-6 py-5 flex flex-col gap-1">
                {links.map((link, i) => (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block py-3 px-3 rounded-xl text-sm font-medium
                                 text-agro-muted hover:text-agro-text
                                 hover:bg-agro-surface transition-all"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}

                {/* Mobile Auth options */}
                <div className="pt-4 border-t border-agro-border/40 mt-2 flex flex-col gap-2">
                  {mounted && isAuthenticated ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <div className="w-7 h-7 rounded-lg bg-agro-amber flex items-center justify-center text-xs font-bold text-agro-bg uppercase">
                          {user?.username[0]}
                        </div>
                        <span className="text-sm font-semibold text-agro-text">
                          {user?.username}
                        </span>
                      </div>
                      <Link
                        href="/hub"
                        onClick={() => setOpen(false)}
                        className="agro-btn w-full justify-center"
                      >
                        Open app
                        <ChevronRight size={15} />
                      </Link>
                      <button
                        onClick={() => {
                          void logout().then(() => {
                            setOpen(false);
                            toast.success("Successfully logged out.");
                            router.push("/");
                          });
                        }}
                        className="agro-btn-ghost w-full justify-center"
                      >
                        <LogOut size={15} />
                        Log Out
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          router.push('/auth');
                        }}
                        className="agro-btn-ghost w-full justify-center"
                      >
                        <LogIn size={15} />
                        Log In
                      </button>
                      <button
                        onClick={() => {
                          router.push('/auth');
                        }}
                        className="agro-btn w-full justify-center"
                      >
                        <UserPlus size={15} />
                        Register
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── LOG IN MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              style={{ background: "#FDFBF7", border: "1px solid #E3DAC9" }}
              className="relative w-full max-w-[400px] p-8 rounded-2xl shadow-2xl z-10"
            >
              <button
                onClick={() => setShowLogin(false)}
                className="absolute top-4 right-4 text-agro-muted hover:text-agro-text"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-agro-amber/10 border border-agro-amber/20 flex items-center justify-center mx-auto mb-3">
                  <LogIn size={18} className="text-agro-amber" />
                </div>
                <h3 className="text-xl font-black text-agro-text tracking-tight">Log In to AgroSphere</h3>
                <p className="text-xs text-agro-muted mt-1">Unlock persistent farm analytics history</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[0.7rem] font-bold text-agro-muted uppercase tracking-wider mb-1.5">Username</label>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="Enter your username"
                    className="agro-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-[0.7rem] font-bold text-agro-muted uppercase tracking-wider mb-1.5">Password</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                    className="agro-input w-full"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="agro-btn w-full justify-center mt-2 py-3"
                >
                  Log In
                </motion.button>
              </form>

              <p className="text-center text-[0.78rem] text-agro-muted mt-4">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => { setShowLogin(false); setShowRegister(true); }}
                  className="text-agro-amber font-bold hover:underline"
                >
                  Register
                </button>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── REGISTER MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {showRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRegister(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              style={{ background: "#FDFBF7", border: "1px solid #E3DAC9" }}
              className="relative w-full max-w-[400px] p-8 rounded-2xl shadow-2xl z-10"
            >
              <button
                onClick={() => setShowRegister(false)}
                className="absolute top-4 right-4 text-agro-muted hover:text-agro-text"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-agro-amber/10 border border-agro-amber/20 flex items-center justify-center mx-auto mb-3">
                  <UserPlus size={18} className="text-agro-amber" />
                </div>
                <h3 className="text-xl font-black text-agro-text tracking-tight">Create Account</h3>
                <p className="text-xs text-agro-muted mt-1">Start tracking your fields and crop predictions</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[0.7rem] font-bold text-agro-muted uppercase tracking-wider mb-1.5">Username</label>
                  <input
                    type="text"
                    value={regUser}
                    onChange={(e) => setRegUser(e.target.value)}
                    placeholder="Choose a username"
                    className="agro-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-[0.7rem] font-bold text-agro-muted uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@farm.com"
                    className="agro-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-[0.7rem] font-bold text-agro-muted uppercase tracking-wider mb-1.5">Password</label>
                  <input
                    type="password"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="Create password"
                    className="agro-input w-full"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="agro-btn w-full justify-center mt-2 py-3"
                >
                  Register
                </motion.button>
              </form>

              <p className="text-center text-[0.78rem] text-agro-muted mt-4">
                Already have an account?{" "}
                <button
                  onClick={() => { setShowRegister(false); setShowLogin(true); }}
                  className="text-agro-amber font-bold hover:underline"
                >
                  Log In
                </button>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}