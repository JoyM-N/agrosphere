const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface FarmInput {
  nitrogen:    number;
  phosphorus:  number;
  potassium:   number;
  ph:          number;
  rainfall:    number;
  temperature: number;
  humidity:    number;
  soil_type:   string;
  season:      string;
  region:      string;
  irrigation:  0 | 1;
  language?:   string;
}

export interface CropResult {
  rank:             number;
  crop:             string;
  confidence:       number;
  confidence_pct:   string;
  confidence_label: string;
  is_primary:       boolean;
}

export interface RecommendationResponse {
  success:              boolean;
  top_crop:             string;
  recommendations:      CropResult[];
  soil_fertility_score: number;
  drought_risk:         "low" | "moderate" | "high" | "critical";
  model_version:        string;
  explanation:          string;
  tips:                 string[];
  climate_warning:      string;
}

export async function getRecommendation(
  input: FarmInput
): Promise<RecommendationResponse> {
  const res = await fetch(`${API_BASE}/api/crops/recommend`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}