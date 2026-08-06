"use client";

import Link from "next/link";
import { Bot, ArrowRight } from "lucide-react";

export default function AssistantStubPage() {
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
            background: "rgba(229,139,25,0.1)", border: "1px solid rgba(229,139,25,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Bot size={26} color="#E58B19" />
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C2010", marginBottom: 8 }}>
          AI Farming Assistant
        </h1>
        <p style={{ color: "#A39686", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 8 }}>
          Coming next. Ask why a crop was recommended, what fertilizer to use, or when to plant —
          with full farm, weather, and recommendation context.
        </p>
        <span
          style={{
            display: "inline-block", fontSize: "0.65rem", fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "#A39686", background: "rgba(163,150,134,0.12)",
            padding: "0.3rem 0.65rem", borderRadius: 999, marginBottom: "1.5rem",
          }}
        >
          Phase 3 · Stub
        </span>
        <div>
          <Link href="/recommend">
            <button className="agro-btn" style={{ fontSize: "0.85rem" }}>
              Get a recommendation first
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
