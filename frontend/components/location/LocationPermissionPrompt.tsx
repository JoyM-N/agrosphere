"use client";

import { useEffect, useState } from "react";
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
import {
  clearAskLocationAfterAuth,
  shouldAskLocationAfterAuth,
} from "@/lib/locationPrompt";

/**
 * Soft prompt after login/register → then browser geolocation dialog.
 * Skips if farm already has a confirmed pin.
 */
export default function LocationPermissionPrompt() {
  const activeFarmId = useAuthStore((s) => s.activeFarmId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shouldAskLocationAfterAuth()) return;

      try {
        let farmId = activeFarmId;
        const farm = farmId
          ? await getFarm(farmId)
          : await ensureDefaultFarm("highland");
        if (!farmId) {
          useAuthStore.setState({ activeFarmId: farm.id });
        }
        if (cancelled) return;
        if (hasConfirmedCoords(farm.latitude, farm.longitude)) {
          clearAskLocationAfterAuth();
          return;
        }
        clearAskLocationAfterAuth();
        setOpen(true);
      } catch {
        if (!cancelled) {
          clearAskLocationAfterAuth();
          setOpen(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFarmId]);

  const dismiss = () => setOpen(false);

  const handleAllow = async () => {
    setBusy(true);
    try {
      const pos = await getBrowserLocation();
      if (!pos) {
        toast.error(
          "Location permission denied or unavailable. You can set it anytime under Farm location."
        );
        setOpen(false);
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
      setOpen(false);
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
            onClick={busy ? undefined : dismiss}
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
              onClick={dismiss}
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
                  style={{ background: "rgba(247,244,235,0.9)", border: "1px solid #E3DAC9" }}
                >
                  <item.icon size={15} color="#4A9661" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span className="text-[0.8rem] leading-snug" style={{ color: "#6B5B49" }}>
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
                onClick={dismiss}
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
