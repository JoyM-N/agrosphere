"use client";

import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";

export default function EconomicsStubPage() {
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
            background: "rgba(74,150,97,0.1)", border: "1px solid rgba(74,150,97,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <TrendingUp size={26} color="#4A9661" />
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C2010", marginBottom: 8 }}>
          Profitability & economics
        </h1>
        <p style={{ color: "#A39686", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 8 }}>
          Estimated costs, market demand, and profit risk by crop will appear here once we wire
          the economics module.
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
          <Link href="/dashboard">
            <button className="agro-btn" style={{ fontSize: "0.85rem" }}>
              Back to dashboard
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
