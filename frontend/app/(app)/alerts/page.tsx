"use client";

import Link from "next/link";
import { Bell, ArrowRight, CloudRain } from "lucide-react";

export default function AlertsStubPage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <div
        style={{
          background: "white",
          border: "1px solid #E3DAC9",
          borderRadius: 20,
          padding: "2.5rem 2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 1.25rem",
            background: "rgba(217,105,42,0.1)", border: "1px solid rgba(217,105,42,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Bell size={26} color="#D9692A" />
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C2010", marginBottom: 8 }}>
          Smart Alerts
        </h1>
        <p style={{ color: "#A39686", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 8 }}>
          Drought, flood, heat, and planting reminders will live here. Weather alerts already
          appear on the Weather page and inside recommendations.
        </p>
        <span
          style={{
            display: "inline-block", fontSize: "0.65rem", fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "#A39686", background: "rgba(163,150,134,0.12)",
            padding: "0.3rem 0.65rem", borderRadius: 999, marginBottom: "1.5rem",
          }}
        >
          Coming soon · Stub
        </span>
        <div>
          <Link href="/weather">
            <button className="agro-btn" style={{ fontSize: "0.85rem" }}>
              <CloudRain size={14} />
              View weather alerts
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
