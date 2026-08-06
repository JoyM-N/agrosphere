"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, CloudRain, Shield, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/useAuthStore";
import {
  ensureDefaultFarm,
  getFarm,
  getFarmWeather,
  updateFarm,
} from "@/lib/api";
import { getBrowserLocation, hasConfirmedCoords } from "@/lib/location";
import { clearAskLocationAfterAuth } from "@/lib/locationPrompt";

/**
 * Soft prompt after login/register → then browser geolocation dialog.
 * Driven by auth store pendingLocationPrompt (set on login/register).
 */
export default function LocationPermissionPrompt() {
  const pendingLocationPrompt = useAuthStore((s) => s.pendingLocationPrompt);
  const clearPendingLocationPrompt = useAuthStore(
    (s) => s.clearPendingLocationPrompt
  );
  const activeFarmId = useAuthStore((s) => s.activeFarmId);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!pendingLocationPrompt || started.current) return;
    started.current = true;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        let farmId = activeFarmId ?? useAuthStore.getState().activeFarmId;
        const farm = farmId
          ? await getFarm(farmId)
          : await ensureDefaultFarm("highland");
        if (!farmId) {
          useAuthStore.setState({ activeFarmId: farm.id });
        }
        if (cancelled) return;

        // Already has a real pin — don't nag
        if (hasConfirmedCoords(farm.latitude, farm.longitude)) {
          clearPendingLocationPrompt();
          clearAskLocationAfterAuth();
          return;
        }
        setOpen(true);
      } catch {
        if (!cancelled) setOpen(true);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pendingLocationPrompt, activeFarmId, clearPendingLocationPrompt]);

  const finish = () => {
    setOpen(false);
    clearPendingLocationPrompt();
    clearAskLocationAfterAuth();
  };

  const handleAllow = async () => {
    setBusy(true);
    try {
      const pos = await getBrowserLocation(15000);
      if (!pos) {
        toast.error(
          "Location permission denied or unavailable. You can set it anytime under Farm location."
        );
        finish();
        return;
      }

      let farmId = useAuthStore.getState().activeFarmId;
      const farm = farmId
        ? await getFarm(farmId)
        : await ensureDefaultFarm("highland");
      farmId = farm.id;
      useAuthStore.setState({ activeFarmId: farmId });

      await updateFarm(farmId, {
        latitude: pos.lat,
        longitude: pos.lon,
      });
      await getFarmWeather(farmId, true).catch(() => undefined);

      toast.success(
        pos.accuracyM
          ? `Farm location saved (±${Math.round(pos.accuracyM)} m)`
          : "Farm location saved from GPS"
      );
      finish();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save location");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={busy ? undefined : finish}
          />

          <motion.div
            role="dialog"
            aria-labelledby="location-prompt-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative z-10 w-full max-w-[400px] rounded-2xl p-7 shadow-2xl"
            style={{ background: "#FDFBF7", border: "1px solid #E3DAC9" }}
          >
            <button
              type="button"
              onClick={finish}
              disabled={busy}
              className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ color: "#A39686" }}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                background: "rgba(229,139,25,0.12)",
                border: "1px solid rgba(229,139,25,0.25)",
              }}
            >
              <MapPin size={22} color="#E58B19" />
            </div>

            <h2
              id="location-prompt-title"
              className="text-center text-xl font-black tracking-tight"
              style={{ color: "#2C2010" }}
            >
              Turn on location?
            </h2>
            <p
              className="mt-2 text-center text-sm leading-relaxed"
              style={{ color: "#6B5B49" }}
            >
              AgroSphere needs your location for accurate weather and climate-smart
              crop recommendations for your farm.
            </p>

            <ul className="mt-5 space-y-2.5">
              {[
                {
                  icon: CloudRain,
                  text: "Live forecast for your exact field, not a city default",
                },
                {
                  icon: Shield,
                  text: "Used only for weather & recommendations — not sold",
                },
              ].map((item) => (
                <li
                  key={item.text}
                  className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
                  style={{
                    background: "rgba(247,244,235,0.9)",
                    border: "1px solid #E3DAC9",
                  }}
                >
                  <item.icon
                    size={15}
                    color="#4A9661"
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span
                    className="text-[0.8rem] leading-snug"
                    style={{ color: "#6B5B49" }}
                  >
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                className="agro-btn w-full justify-center py-3"
                disabled={busy}
                onClick={() => void handleAllow()}
              >
                {busy ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Getting location…
                  </>
                ) : (
                  <>
                    <MapPin size={15} />
                    Allow location
                  </>
                )}
              </button>
              <button
                type="button"
                className="agro-btn-ghost w-full justify-center"
                disabled={busy}
                onClick={finish}
              >
                Not now
              </button>
            </div>
            <p
              className="mt-3 text-center text-[0.7rem]"
              style={{ color: "#A39686" }}
            >
              You can change this anytime under Farm location.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
