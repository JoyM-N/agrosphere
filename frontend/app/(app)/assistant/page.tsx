"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bot, Send, Loader2, Leaf, Sprout, CloudRain, MapPin, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/useAuthStore";
import {
  sendAssistantChat,
  getAssistantContext,
  type ChatMessage,
} from "@/lib/api";

const SUGGESTIONS = [
  "Why was this crop recommended for my farm?",
  "When should I plant this season?",
  "How do I handle drought risk with mulching?",
  "What fertilizer or manure should I use?",
];

export default function AssistantPage() {
  const { activeFarmId } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{
    context_used: boolean;
    has_recommendation: boolean;
    has_weather: boolean;
    has_confirmed_location: boolean;
    source?: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = await getAssistantContext(activeFarmId);
        if (cancelled) return;
        setMeta({
          context_used: !!ctx.farm,
          has_recommendation: ctx.has_recommendation,
          has_weather: ctx.has_weather,
          has_confirmed_location: ctx.has_confirmed_location,
        });
      } catch {
        /* chips optional until first message */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFarmId]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setBusy(true);

    try {
      const res = await sendAssistantChat({
        message: trimmed,
        farm_id: activeFarmId,
        history: messages,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
      setMeta({
        context_used: res.context_used,
        has_recommendation: res.has_recommendation,
        has_weather: res.has_weather,
        has_confirmed_location: !!res.has_confirmed_location,
        source: res.source,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assistant unavailable");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry — I couldn't reach the assistant just now. Check that the API is running and try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "1.5rem 1.25rem 2rem",
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 3.5rem)",
      }}
    >
      <div style={{ marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: "0.72rem", fontWeight: 700, color: "#E58B19",
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
          }}
        >
          <Bot size={12} />
          AI assistant
        </div>
        <h1
          style={{
            fontSize: "1.65rem", fontWeight: 900, color: "#2C2010",
            letterSpacing: "-0.02em", marginBottom: 6,
          }}
        >
          Ask about your farm
        </h1>
        <p style={{ color: "#A39686", fontSize: "0.88rem", maxWidth: 520 }}>
          Grounded on your location, weather, soil, and latest crop recommendation.
        </p>
      </div>

      {/* Context chips */}
      <div
        style={{
          display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1rem",
        }}
      >
        {[
          {
            ok: meta?.has_confirmed_location ?? null,
            label: "Location",
            href: "/location",
            icon: MapPin,
            ready: "confirmed",
            missing: "needed",
          },
          {
            ok: meta?.has_weather ?? null,
            label: "Weather",
            href: "/weather",
            icon: CloudRain,
            ready: "ready",
            missing: "missing",
          },
          {
            ok: meta?.has_recommendation ?? null,
            label: "Recommendation",
            href: "/recommend",
            icon: Sprout,
            ready: "ready",
            missing: "missing",
          },
        ].map((c) => (
          <Link key={c.label} href={c.href}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: "0.72rem", fontWeight: 700,
                padding: "0.35rem 0.7rem", borderRadius: 999,
                border: "1px solid #E3DAC9",
                background: c.ok === true
                  ? "rgba(74,150,97,0.1)"
                  : c.ok === false
                    ? "rgba(229,139,25,0.08)"
                    : "white",
                color: c.ok === true ? "#3D7A4E" : "#6B5B49",
              }}
            >
              <c.icon size={12} />
              {c.label}
              {c.ok === true ? ` · ${c.ready}` : c.ok === false ? ` · ${c.missing}` : ""}
            </span>
          </Link>
        ))}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          background: "white",
          border: "1px solid #E3DAC9",
          borderRadius: 20,
          padding: "1.1rem",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 360,
          maxHeight: "calc(100vh - 280px)",
          overflowY: "auto",
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 14, margin: "0 auto 1rem",
                background: "rgba(229,139,25,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Leaf size={22} color="#E58B19" />
            </div>
            <p style={{ color: "#6B5B49", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Ask anything about planting, fertilizer, drought, or your last recommendation.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  style={{
                    textAlign: "left",
                    padding: "0.7rem 0.9rem",
                    borderRadius: 12,
                    border: "1px solid #E3DAC9",
                    background: "#FDFBF7",
                    color: "#2C2010",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "0.75rem 1rem",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: m.role === "user" ? "#E58B19" : "#F7F4EB",
                color: m.role === "user" ? "#FDFBF7" : "#2C2010",
                fontSize: "0.88rem",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#A39686", fontSize: "0.82rem" }}>
            <Loader2 size={14} className="animate-spin" />
            Thinking with your farm context…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {meta?.source === "fallback" && (
        <p
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: "0.72rem", color: "#A39686", marginTop: 8,
          }}
        >
          <AlertCircle size={12} />
          Using offline tips — Gemini may be unavailable.
        </p>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        style={{
          display: "flex", gap: 8, marginTop: 12, alignItems: "flex-end",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your crops, weather, or soil…"
          rows={2}
          disabled={busy}
          className="agro-input"
          style={{ flex: 1, resize: "none", minHeight: 52 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <button
          type="submit"
          className="agro-btn"
          disabled={busy || !input.trim()}
          style={{ height: 52, padding: "0 1.1rem" }}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
