"""
AgroSphere Gemini AI Service
==============================
Uses the new google.genai SDK (replaces deprecated google.generativeai).
Model: gemini-2.0-flash — fast, cheap, available on free tier.

What this service does:
  Takes ML prediction results and farm context, returns a
  farmer-friendly explanation in plain English (or Swahili).

  Output structure:
    explanation    : 2-3 sentences why this crop suits the farm
    tips           : 3 practical actions the farmer can take now
    climate_warning: 1 sentence about the main seasonal risk
"""

import json
import sys
from pathlib import Path
from google import genai
from google.genai import types

sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import config

# ─── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
You are AgroSphere's agricultural advisor helping small-scale
farmers in East Africa make better crop decisions.

Your communication rules:
- Use simple English a farmer with primary school education understands
- Never use technical jargon
- Be encouraging and practical
- Suggest locally available solutions (compost, wood ash, manure, mulching)
- Be honest about risks without being discouraging
- Keep responses concise — farmers are busy

Your response must follow this exact JSON structure:
{
  "explanation": "2-3 sentences explaining why this crop suits their farm",
  "tips": [
    "Specific action tip 1 — before planting",
    "Specific action tip 2 — during growing season",
    "Specific action tip 3 — for better yield"
  ],
  "climate_warning": "One sentence about the main weather risk this season"
}

Return ONLY the JSON object. No extra text, no markdown, no code blocks.
""".strip()


# ─── Prompt builder ───────────────────────────────────────────────────────────

def build_prompt(
    top_crop: str,
    recommendations: list,
    soil_fertility: float,
    drought_risk: str,
    farm_context: dict,
    language: str = "en",
) -> str:

    top3 = recommendations[:3]
    rec_text = ", ".join(
        [f"{r['crop']} ({r['confidence_pct']})" for r in top3]
    )

    if soil_fertility >= 0.7:   fertility_text = "excellent"
    elif soil_fertility >= 0.5: fertility_text = "good"
    elif soil_fertility >= 0.3: fertility_text = "moderate — needs improvement"
    else:                       fertility_text = "poor — needs significant work"

    lang_instruction = (
        "\nRespond in Swahili." if language == "sw" else ""
    )

    return f"""
A farmer in {farm_context.get('region', 'East Africa').replace('_', ' ')} submitted their farm data.

FARM CONDITIONS:
- Nitrogen: {farm_context.get('nitrogen')} mg/kg
- Phosphorus: {farm_context.get('phosphorus')} mg/kg
- Potassium: {farm_context.get('potassium')} mg/kg
- Soil pH: {farm_context.get('ph')}
- Annual rainfall: {farm_context.get('rainfall')} mm
- Temperature: {farm_context.get('temperature')}°C
- Humidity: {farm_context.get('humidity')}%
- Soil type: {farm_context.get('soil_type')}
- Season: {farm_context.get('season', '').replace('_', ' ')}
- Irrigation: {'Yes' if farm_context.get('irrigation') else 'No'}

AI RESULTS:
- Top recommended crop: {top_crop}
- All recommendations: {rec_text}
- Soil fertility: {fertility_text} ({soil_fertility:.0%})
- Drought risk: {drought_risk}

Explain to this farmer why {top_crop} suits their farm, give 3 practical
tips, and name the main climate risk this season.{lang_instruction}
""".strip()


# ─── Main function ────────────────────────────────────────────────────────────

async def explain_recommendation(
    top_crop: str,
    recommendations: list,
    soil_fertility: float,
    drought_risk: str,
    farm_context: dict,
    language: str = "en",
) -> dict:
    """
    Calls Gemini 2.0 Flash to generate farmer-friendly explanation.
    Falls back to rule-based response if API call fails.
    """
    try:
        client = genai.Client(api_key=config.GEMINI_API_KEY)

        prompt = build_prompt(
            top_crop        = top_crop,
            recommendations = recommendations,
            soil_fertility  = soil_fertility,
            drought_risk    = drought_risk,
            farm_context    = farm_context,
            language        = language,
        )

        response = await client.aio.models.generate_content(
            model    = "gemini-2.5-flash-lite",
            contents = prompt,
            config   = types.GenerateContentConfig(
                system_instruction = SYSTEM_PROMPT,
                temperature        = 0.4,   # low = more consistent output
                max_output_tokens  = 500,
            ),
        )

        text = response.text.strip()

        # Strip markdown code blocks if Gemini wraps the JSON
        if text.startswith("```"):
            lines = text.split("\n")
            text  = "\n".join(
                l for l in lines
                if not l.strip().startswith("```")
            ).strip()

        result = json.loads(text)

        # Validate keys present
        assert "explanation"     in result
        assert "tips"            in result
        assert "climate_warning" in result

        return result

    except Exception as e:
        print(f"[ Gemini ] Fallback triggered: {e}")
        return _fallback_explanation(top_crop, drought_risk, soil_fertility)


# ─── Rule-based fallback ──────────────────────────────────────────────────────

def _fallback_explanation(
    top_crop: str,
    drought_risk: str,
    soil_fertility: float,
) -> dict:
    """
    Used when Gemini API is unavailable.
    Ensures the platform always returns a useful response.
    """
    fertility_tip = (
        "Your soil is in good condition for planting."
        if soil_fertility >= 0.5
        else "Add compost or animal manure before planting to improve soil nutrients."
    )

    drought_tip = {
        "low":      "Rainfall looks good — plant at the start of the season.",
        "moderate": "Rainfall may vary — prepare for dry spells with mulching.",
        "high":     "Drought risk is high — use mulch to retain soil moisture.",
        "critical": "Very dry conditions — irrigation is strongly recommended.",
    }.get(drought_risk, "Monitor rainfall closely this season.")

    return {
        "explanation": (
            f"{top_crop.capitalize()} is well suited to your farm's current "
            f"soil and climate conditions. {fertility_tip}"
        ),
        "tips": [
            f"Prepare your land 2-3 weeks before planting {top_crop}.",
            "Add organic matter like compost or manure to boost soil health.",
            "Plant at the start of the rains for the best germination rate.",
        ],
        "climate_warning": drought_tip,
    }