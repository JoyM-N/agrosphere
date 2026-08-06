"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin, Navigation, CheckCircle2, AlertTriangle,
  CloudRain, Sprout, RefreshCw, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/useAuthStore";
import {
  ensureDefaultFarm,
  getFarm,
  getFarmWeather,
  updateFarm,
  type Farm,
} from "@/lib/api";
import {
  REGIONS,
  coordsForRegion,
  formatCoords,
  getBrowserLocation,
  hasConfirmedCoords,
  osmEmbedUrl,
  osmViewUrl,
  type AgroRegion,
} from "@/lib/location";

export default function FarmLocationPage() {
  const activeFarmId = useAuthStore((s) => s.activeFarmId);

  const [farm, setFarm] = useState<Farm | null>(null);
  const [region, setRegion] = useState<AgroRegion>("highland");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);

  const applyDraftFromFarm = (f: Farm) => {
    const r = (f.region || "highland") as AgroRegion;
    setRegion(REGIONS.some((x) => x.value === r) ? r : "highland");
    if (hasConfirmedCoords(f.latitude, f.longitude)) {
      setLat(String(f.latitude));
      setLon(String(f.longitude));
    } else {
      const d = coordsForRegion(r);
      setLat(String(d.lat));
      setLon(String(d.lon));
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let f: Farm;
      if (activeFarmId) {
        f = await getFarm(activeFarmId);
      } else {
        f = await ensureDefaultFarm("highland");
        useAuthStore.setState({ activeFarmId: f.id });
      }
      setFarm(f);
      applyDraftFromFarm(f);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load farm");
    } finally {
      setLoading(false);
    }
  }, [activeFarmId]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsed = (() => {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
    if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
    return { lat: la, lon: lo };
  })();

  const confirmed = farm ? hasConfirmedCoords(farm.latitude, farm.longitude) : false;
  const regionHint = coordsForRegion(region);

  const onRegionChange = (r: AgroRegion) => {
    setRegion(r);
    // If user hasn't confirmed yet, snap draft pin to region default
    if (!confirmed) {
      const d = coordsForRegion(r);
      setLat(String(d.lat));
      setLon(String(d.lon));
    }
  };

  const useGps = async () => {
    setGpsLoading(true);
    const toastId = toast.loading("Getting your GPS position…");
    try {
      const pos = await getBrowserLocation();
      if (!pos) {
        toast.error(
          "Could not get GPS. Allow location access, or enter coordinates manually.",
          { id: toastId }
        );
        return;
      }
      setLat(pos.lat.toFixed(5));
      setLon(pos.lon.toFixed(5));
      setAccuracyM(pos.accuracyM);
      toast.success(
        pos.accuracyM
          ? `GPS ready (±${Math.round(pos.accuracyM)} m). Confirm to save.`
          : "GPS ready. Confirm to save.",
        { id: toastId }
      );
    } finally {
      setGpsLoading(false);
    }
  };

  const useRegionDefault = () => {
    const d = coordsForRegion(region);
    setLat(String(d.lat));
    setLon(String(d.lon));
    setAccuracyM(null);
    toast.message(`Pinned to ${d.label}. Confirm to save.`);
  };

  const saveLocation = async () => {
    if (!farm || !parsed) {
      toast.error("Enter valid latitude (−90…90) and longitude (−180…180).");
      return;
    }
    setSaving(true);
    const toastId = toast.loading("Saving farm location…");
    try {
      const updated = await updateFarm(farm.id, {
        region,
        latitude: parsed.lat,
        longitude: parsed.lon,
      });
      setFarm(updated);
      useAuthStore.setState({ activeFarmId: updated.id });
      // Force weather refresh so forecasts use the new pin
      await getFarmWeather(updated.id, true).catch(() => undefined);
      toast.success("Location confirmed. Weather & recommendations will use this pin.", {
        id: toastId,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <p style={{ color: "#A39686" }}>Loading farm location…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <div style={{ marginBottom: "1.75rem" }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: "0.72rem", fontWeight: 700, color: "#4A9661",
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
          }}
        >
          <MapPin size={12} />
          Farm location
        </div>
        <h1
          style={{
            fontSize: "1.75rem", fontWeight: 900, color: "#2C2010",
            letterSpacing: "-0.02em", marginBottom: 6,
          }}
        >
          Confirm where you farm
        </h1>
        <p style={{ color: "#A39686", fontSize: "0.9rem", maxWidth: 520, lineHeight: 1.55 }}>
          Weather forecasts and climate enrichment for crop recommendations use this pin.
          Confirm GPS, a map point, or your agro-ecological region.
        </p>
      </div>

      {/* Status */}
      <div
        style={{
          display: "flex", gap: 12, alignItems: "flex-start",
          padding: "1rem 1.15rem", borderRadius: 14, marginBottom: "1.25rem",
          border: confirmed
            ? "1px solid rgba(74,150,97,0.35)"
            : "1px solid rgba(229,139,25,0.35)",
          background: confirmed
            ? "rgba(74,150,97,0.08)"
            : "rgba(229,139,25,0.08)",
        }}
      >
        {confirmed ? (
          <CheckCircle2 size={18} color="#4A9661" style={{ flexShrink: 0, marginTop: 2 }} />
        ) : (
          <AlertTriangle size={18} color="#E58B19" style={{ flexShrink: 0, marginTop: 2 }} />
        )}
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#2C2010", marginBottom: 4 }}>
            {confirmed ? "Location confirmed" : "Using region estimate"}
          </div>
          <p style={{ fontSize: "0.82rem", color: "#6B5B49", lineHeight: 1.5 }}>
            {confirmed && farm?.latitude != null && farm?.longitude != null
              ? `Saved pin: ${formatCoords(farm.latitude, farm.longitude)} · region ${farm.region.replace("_", " ")}`
              : `No GPS pin yet. Showing ${regionHint.label} until you confirm.`}
          </p>
        </div>
      </div>

      {/* Region */}
      <label
        style={{
          display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#A39686",
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
        }}
      >
        Agro-ecological region
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 8,
          marginBottom: "1.25rem",
        }}
      >
        {REGIONS.map((r) => {
          const active = region === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => onRegionChange(r.value)}
              style={{
                textAlign: "left",
                padding: "0.75rem 0.85rem",
                borderRadius: 12,
                border: active
                  ? "1px solid rgba(229,139,25,0.5)"
                  : "1px solid #E3DAC9",
                background: active ? "rgba(229,139,25,0.1)" : "white",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#2C2010" }}>
                {r.label}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#A39686", marginTop: 2 }}>
                {r.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Map */}
      {parsed && (
        <div
          style={{
            borderRadius: 16, overflow: "hidden", border: "1px solid #E3DAC9",
            marginBottom: "1rem", background: "white",
          }}
        >
          <iframe
            title="Farm map"
            src={osmEmbedUrl(parsed.lat, parsed.lon)}
            style={{ width: "100%", height: 260, border: 0, display: "block" }}
            loading="lazy"
          />
          <div
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "0.65rem 1rem", borderTop: "1px solid #E3DAC9", gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#6B5B49", fontFamily: "monospace" }}>
              {formatCoords(parsed.lat, parsed.lon, 5)}
              {accuracyM != null ? ` · ±${Math.round(accuracyM)} m` : ""}
            </span>
            <a
              href={osmViewUrl(parsed.lat, parsed.lon)}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "0.75rem", fontWeight: 700, color: "#C56F10",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}
            >
              Open map <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Manual coords */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
          marginBottom: "1rem",
        }}
      >
        <div>
          <label
            style={{
              display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#A39686",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
            }}
          >
            Latitude
          </label>
          <input
            className="agro-input"
            value={lat}
            onChange={(e) => { setLat(e.target.value); setAccuracyM(null); }}
            placeholder="-1.2921"
            inputMode="decimal"
          />
        </div>
        <div>
          <label
            style={{
              display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#A39686",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
            }}
          >
            Longitude
          </label>
          <input
            className="agro-input"
            value={lon}
            onChange={(e) => { setLon(e.target.value); setAccuracyM(null); }}
            placeholder="36.8219"
            inputMode="decimal"
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1.5rem" }}>
        <button
          type="button"
          className="agro-btn"
          disabled={saving || !parsed}
          onClick={() => void saveLocation()}
          style={{ fontSize: "0.85rem" }}
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Confirm location
        </button>
        <button
          type="button"
          className="agro-btn-ghost"
          disabled={gpsLoading}
          onClick={() => void useGps()}
          style={{ fontSize: "0.85rem" }}
        >
          <Navigation size={14} className={gpsLoading ? "animate-spin" : ""} />
          Use my GPS
        </button>
        <button
          type="button"
          className="agro-btn-ghost"
          onClick={useRegionDefault}
          style={{ fontSize: "0.85rem" }}
        >
          <MapPin size={14} />
          Use region centre
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link href="/weather">
          <button className="agro-btn-ghost" style={{ fontSize: "0.82rem" }}>
            <CloudRain size={14} />
            View weather
          </button>
        </Link>
        <Link href="/recommend">
          <button className="agro-btn-ghost" style={{ fontSize: "0.82rem" }}>
            <Sprout size={14} />
            Get recommendation
          </button>
        </Link>
      </div>
    </div>
  );
}
