"""
Open-Meteo weather client for AgroSphere.

Why Open-Meteo:
  - Free for non-commercial & commercial use (fair use)
  - No API key required for forecast endpoints
  - Good coverage across Africa
  - Simple HTTPS JSON API

Docs: https://open-meteo.com/en/docs
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from pydantic import BaseModel, Field

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Approximate East Africa centroids when a farm has no coordinates yet.
REGION_DEFAULTS: dict[str, tuple[float, float]] = {
    "coastal":   (-4.05, 39.67),   # Mombasa area
    "highland":  (-1.29, 36.82),   # Nairobi / central highlands
    "semi_arid": (0.52, 35.28),    # Rift / semi-arid belt
    "sub_humid": (-0.10, 34.75),   # Lake Victoria basin
    "arid":      (3.12, 35.60),    # Northern arid belt
}


class CurrentWeather(BaseModel):
    temperature_c: float
    humidity_pct: float
    precipitation_mm: float
    weather_code: Optional[int] = None
    observed_at: str


class DailyForecast(BaseModel):
    date: str
    temp_max_c: float
    temp_min_c: float
    precipitation_mm: float
    precip_probability_pct: Optional[float] = None


class WeatherAlert(BaseModel):
    level: str  # info | watch | warning
    kind: str   # drought | heavy_rain | heat | cold
    message: str


class WeatherSnapshot(BaseModel):
    latitude: float
    longitude: float
    timezone: str
    source: str = "open-meteo"
    current: CurrentWeather
    daily: list[DailyForecast] = Field(default_factory=list)
    alerts: list[WeatherAlert] = Field(default_factory=list)
    # Convenience fields for crop recommend form autofill
    suggest_temperature: float
    suggest_humidity: float
    suggest_rainfall_mm_year_proxy: float
    fetched_at: str


def resolve_coordinates(
    *,
    latitude: Optional[float],
    longitude: Optional[float],
    region: Optional[str] = None,
) -> tuple[float, float]:
    if latitude is not None and longitude is not None:
        return float(latitude), float(longitude)
    if region and region in REGION_DEFAULTS:
        return REGION_DEFAULTS[region]
    # Sensible East Africa default (Nairobi)
    return REGION_DEFAULTS["highland"]


def _build_alerts(daily: list[DailyForecast], current: CurrentWeather) -> list[WeatherAlert]:
    alerts: list[WeatherAlert] = []
    if not daily:
        return alerts

    next3 = daily[:3]
    rain_3d = sum(d.precipitation_mm for d in next3)
    max_temp = max(d.temp_max_c for d in next3)
    min_temp = min(d.temp_min_c for d in next3)

    if rain_3d < 2:
        alerts.append(
            WeatherAlert(
                level="warning",
                kind="drought",
                message=(
                    f"Very low rainfall expected over the next 3 days "
                    f"({rain_3d:.1f} mm total). Plan irrigation if possible."
                ),
            )
        )
    elif rain_3d < 8:
        alerts.append(
            WeatherAlert(
                level="watch",
                kind="drought",
                message=(
                    f"Light rainfall ahead ({rain_3d:.1f} mm over 3 days). "
                    "Watch soil moisture closely."
                ),
            )
        )

    heavy = [d for d in next3 if d.precipitation_mm >= 40]
    if heavy:
        alerts.append(
            WeatherAlert(
                level="warning",
                kind="heavy_rain",
                message=(
                    f"Heavy rain likely on {heavy[0].date} "
                    f"({heavy[0].precipitation_mm:.0f} mm). "
                    "Protect seedlings and check for waterlogging."
                ),
            )
        )

    if max_temp >= 35:
        alerts.append(
            WeatherAlert(
                level="warning",
                kind="heat",
                message=(
                    f"High temperatures up to {max_temp:.0f}°C expected. "
                    "Mulch and water early morning or evening."
                ),
            )
        )
    if min_temp <= 8:
        alerts.append(
            WeatherAlert(
                level="watch",
                kind="cold",
                message=(
                    f"Cool nights near {min_temp:.0f}°C ahead. "
                    "Sensitive crops may need protection."
                ),
            )
        )

    if current.humidity_pct >= 90 and rain_3d >= 15:
        alerts.append(
            WeatherAlert(
                level="info",
                kind="heavy_rain",
                message=(
                    "High humidity with rain ahead — fungal disease risk rises. "
                    "Improve airflow and avoid overwatering."
                ),
            )
        )

    return alerts


def _annual_rainfall_proxy(daily: list[DailyForecast]) -> float:
    """Rough mm/year estimate from the 7-day forecast (for form autofill only)."""
    if not daily:
        return 800.0
    week = sum(d.precipitation_mm for d in daily)
    return round(max(50.0, min(3000.0, week * (365.0 / 7.0))), 1)


async def fetch_weather(
    latitude: float,
    longitude: float,
    *,
    forecast_days: int = 7,
) -> WeatherSnapshot:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code",
        "daily": (
            "temperature_2m_max,temperature_2m_min,"
            "precipitation_sum,precipitation_probability_max"
        ),
        "timezone": "auto",
        "forecast_days": forecast_days,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.get(OPEN_METEO_URL, params=params)
        res.raise_for_status()
        data: dict[str, Any] = res.json()

    current_raw = data.get("current") or {}
    daily_raw = data.get("daily") or {}

    current = CurrentWeather(
        temperature_c=float(current_raw.get("temperature_2m", 0)),
        humidity_pct=float(current_raw.get("relative_humidity_2m", 0)),
        precipitation_mm=float(current_raw.get("precipitation", 0)),
        weather_code=current_raw.get("weather_code"),
        observed_at=str(current_raw.get("time") or datetime.now(timezone.utc).isoformat()),
    )

    daily: list[DailyForecast] = []
    dates = daily_raw.get("time") or []
    for i, date in enumerate(dates):
        probs = daily_raw.get("precipitation_probability_max") or []
        daily.append(
            DailyForecast(
                date=date,
                temp_max_c=float((daily_raw.get("temperature_2m_max") or [0])[i]),
                temp_min_c=float((daily_raw.get("temperature_2m_min") or [0])[i]),
                precipitation_mm=float((daily_raw.get("precipitation_sum") or [0])[i]),
                precip_probability_pct=(
                    float(probs[i]) if i < len(probs) and probs[i] is not None else None
                ),
            )
        )

    alerts = _build_alerts(daily, current)
    rainfall_proxy = _annual_rainfall_proxy(daily)

    return WeatherSnapshot(
        latitude=latitude,
        longitude=longitude,
        timezone=str(data.get("timezone") or "auto"),
        current=current,
        daily=daily,
        alerts=alerts,
        suggest_temperature=round(current.temperature_c, 1),
        suggest_humidity=round(current.humidity_pct, 1),
        suggest_rainfall_mm_year_proxy=rainfall_proxy,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )
