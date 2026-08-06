const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface FarmInput {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  rainfall: number;
  temperature: number;
  humidity: number;
  soil_type: string;
  season: string;
  region: string;
  irrigation: 0 | 1;
  language?: string;
  use_live_weather?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface CropResult {
  rank: number;
  crop: string;
  confidence: number;
  confidence_pct: string;
  confidence_label: string;
  is_primary: boolean;
}

export interface RecommendationResponse {
  success: boolean;
  top_crop: string;
  recommendations: CropResult[];
  soil_fertility_score: number;
  drought_risk: "low" | "moderate" | "high" | "critical";
  model_version: string;
  explanation: string;
  tips: string[];
  climate_warning: string;
  weather?: Record<string, unknown> | null;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface Farm {
  id: string;
  name: string;
  region: string;
  country: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface PersistedRecommendation {
  id: string;
  farm_id: string;
  top_crop: string;
  results: CropResult[];
  soil_fertility_score: number;
  drought_risk: string;
  explanation: string;
  tips: string[];
  climate_warning: string;
  model_version: string;
  input_snapshot: Record<string, unknown>;
  created_at: string;
  weather_snapshot_id?: string | null;
  weather?: Record<string, unknown> | null;
}

/** Module-level access token so API helpers stay outside React. */
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

function formatDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) =>
        typeof d === "object" && d && "msg" in d
          ? String((d as { msg: string }).msg)
          : JSON.stringify(d)
      )
      .join(", ");
  }
  return "Request failed";
}

async function parseError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({}));
  return formatDetail(err.detail) || `Error ${res.status}`;
}

type FetchOptions = RequestInit & {
  auth?: boolean;
  /** Skip one refresh retry (internal). */
  _retried?: boolean;
};

export async function apiFetch(
  path: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { auth = false, _retried = false, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);

  if (rest.body && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth && accessToken) {
    finalHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: "include",
  });

  if (res.status === 401 && auth && !_retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch(path, { ...options, _retried: true });
    }
  }

  return res;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data: TokenResponse = await res.json();
    setAccessToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<TokenResponse> {
  const res = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data: TokenResponse = await res.json();
  setAccessToken(data.access_token);
  return data;
}

export async function loginUser(
  username: string,
  password: string
): Promise<TokenResponse> {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data: TokenResponse = await res.json();
  setAccessToken(data.access_token);
  return data;
}

export async function logoutUser(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  setAccessToken(null);
}

export async function refreshSession(): Promise<TokenResponse> {
  const res = await apiFetch("/api/auth/refresh", { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res));
  const data: TokenResponse = await res.json();
  setAccessToken(data.access_token);
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const res = await apiFetch("/api/auth/me", { auth: true });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function listFarms(): Promise<Farm[]> {
  const res = await apiFetch("/api/farms", { auth: true });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getFarm(farmId: string): Promise<Farm> {
  const res = await apiFetch(`/api/farms/${farmId}`, { auth: true });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createFarm(input: {
  name: string;
  region: string;
  country?: string;
  county?: string;
}): Promise<Farm> {
  const res = await apiFetch("/api/farms", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateFarm(
  farmId: string,
  patch: {
    name?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<Farm> {
  const res = await apiFetch(`/api/farms/${farmId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function upsertSoil(
  farmId: string,
  soil: Omit<FarmInput, "region" | "language">
): Promise<void> {
  const res = await apiFetch(`/api/farms/${farmId}/soil`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(soil),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function listFarmRecommendations(
  farmId: string
): Promise<PersistedRecommendation[]> {
  const res = await apiFetch(`/api/farms/${farmId}/recommendations`, {
    auth: true,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function recommendForFarm(
  farmId: string,
  input: FarmInput
): Promise<PersistedRecommendation> {
  const { region: _region, ...rest } = input;
  const res = await apiFetch(`/api/farms/${farmId}/recommend`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      ...rest,
      use_live_weather: input.use_live_weather ?? true,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Guest / public recommend — no auth required. */
export async function getRecommendation(
  input: FarmInput
): Promise<RecommendationResponse> {
  const res = await apiFetch("/api/crops/recommend", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export function persistedToRecommendationResponse(
  row: PersistedRecommendation
): RecommendationResponse {
  return {
    success: true,
    top_crop: row.top_crop,
    recommendations: row.results,
    soil_fertility_score: row.soil_fertility_score,
    drought_risk: row.drought_risk as RecommendationResponse["drought_risk"],
    model_version: row.model_version,
    explanation: row.explanation,
    tips: row.tips as string[],
    climate_warning: row.climate_warning,
    weather: row.weather ?? null,
  };
}

export async function ensureDefaultFarm(region: string): Promise<Farm> {
  const farms = await listFarms();
  if (farms.length > 0) {
    const farm = farms[0];
    if (farm.region !== region) {
      return updateFarm(farm.id, { region });
    }
    return farm;
  }
  return createFarm({ name: "My Farm", region });
}

export interface WeatherAlert {
  level: string;
  kind: string;
  message: string;
}

export interface WeatherSnapshot {
  id?: string | null;
  cached?: boolean;
  latitude: number;
  longitude: number;
  timezone: string;
  source: string;
  current: {
    temperature_c: number;
    humidity_pct: number;
    precipitation_mm: number;
    weather_code?: number | null;
    observed_at: string;
  };
  daily: Array<{
    date: string;
    temp_max_c: number;
    temp_min_c: number;
    precipitation_mm: number;
    precip_probability_pct?: number | null;
  }>;
  alerts: WeatherAlert[];
  suggest_temperature: number;
  suggest_humidity: number;
  suggest_rainfall_mm_year_proxy: number;
  fetched_at: string;
  features?: Record<string, unknown>;
}

export async function getWeatherForecast(params: {
  latitude?: number;
  longitude?: number;
  region?: string;
}): Promise<WeatherSnapshot> {
  const q = new URLSearchParams();
  if (params.latitude != null) q.set("latitude", String(params.latitude));
  if (params.longitude != null) q.set("longitude", String(params.longitude));
  if (params.region) q.set("region", params.region);
  const res = await apiFetch(`/api/weather/forecast?${q.toString()}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getFarmWeather(
  farmId: string,
  refresh = false
): Promise<WeatherSnapshot> {
  const q = refresh ? "?refresh=true" : "";
  const res = await apiFetch(`/api/weather/farms/${farmId}${q}`, { auth: true });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function listFarmWeatherHistory(
  farmId: string,
  limit = 10
): Promise<
  Array<{
    id: string;
    fetched_at: string;
    latitude: number;
    longitude: number;
    source: string;
    features: Record<string, unknown>;
    alerts: Array<{ level: string; kind: string; message: string }>;
  }>
> {
  const res = await apiFetch(
    `/api/weather/farms/${farmId}/history?limit=${limit}`,
    { auth: true }
  );
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/* ── Assistant + Alerts (Phase 3) ─────────────────────────────────────── */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  source: string;
  farm_id: string | null;
  context_used: boolean;
  has_recommendation: boolean;
  has_weather: boolean;
  has_confirmed_location?: boolean;
}

export async function sendAssistantChat(input: {
  message: string;
  farm_id?: string | null;
  history?: ChatMessage[];
  language?: string;
}): Promise<ChatResponse> {
  const res = await apiFetch("/api/assistant/chat", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      message: input.message,
      farm_id: input.farm_id || undefined,
      history: input.history ?? [],
      language: input.language ?? "en",
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getAssistantContext(
  farmId?: string | null
): Promise<{
  has_recommendation: boolean;
  has_weather: boolean;
  has_confirmed_location: boolean;
  farm: { id: string; name: string } | null;
}> {
  const q = farmId ? `?farm_id=${encodeURIComponent(farmId)}` : "";
  const res = await apiFetch(`/api/assistant/context${q}`, { auth: true });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export interface FarmAlert {
  level: string;
  kind: string;
  message: string;
  source: string;
}

export interface AlertsResponse {
  farm_id: string | null;
  farm_name?: string | null;
  region?: string | null;
  generated_at: string;
  weather_ok: boolean;
  season?: string | null;
  features: Record<string, unknown>;
  alerts: FarmAlert[];
  summary: { total: number; warnings: number; watches: number };
}

export async function getFarmAlerts(
  farmId?: string | null
): Promise<AlertsResponse> {
  const q = farmId ? `?farm_id=${encodeURIComponent(farmId)}` : "";
  const res = await apiFetch(`/api/alerts${q}`, { auth: true });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/* ── Economics & sustainability (Phase 4) ─────────────────────────────── */

export interface CropEconomicsRow {
  crop: string;
  display: string;
  unit: string;
  cycle_months: number;
  water_intensity: string;
  yield_per_acre: number;
  price_kes: number;
  input_cost_kes: number;
  labour_cost_kes: number;
  estimated_cost_kes_per_acre: number;
  estimated_revenue_kes_per_acre: number;
  estimated_margin_kes_per_acre: number;
  margin_pct: number;
  assumptions?: string[];
  ml_confidence_pct?: string;
  ml_rank?: number;
}

export interface SustainabilityPillar {
  score: number;
  reasons: string[];
}

export interface SustainabilityReport {
  score: number;
  grade: string;
  method: string;
  method_note: string;
  pillars: {
    water: SustainabilityPillar;
    soil: SustainabilityPillar;
    climate: SustainabilityPillar;
  };
  tips: string[];
}

export interface EconomicsResponse {
  farm_id: string | null;
  farm_name?: string | null;
  region?: string | null;
  currency: string;
  source: string;
  disclaimer: string;
  generated_at: string;
  focus: CropEconomicsRow | null;
  alternatives: CropEconomicsRow[];
  sustainability: SustainabilityReport;
  price_table: CropEconomicsRow[];
  has_recommendation?: boolean;
  weather_features?: Record<string, unknown>;
  message?: string | null;
}

export async function getFarmEconomics(
  farmId?: string | null,
  crop?: string | null
): Promise<EconomicsResponse> {
  const q = new URLSearchParams();
  if (farmId) q.set("farm_id", farmId);
  if (crop) q.set("crop", crop);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await apiFetch(`/api/economics${suffix}`, { auth: true });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
