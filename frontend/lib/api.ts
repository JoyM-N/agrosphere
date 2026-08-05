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
  patch: { name?: string; region?: string }
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
    body: JSON.stringify(rest),
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
