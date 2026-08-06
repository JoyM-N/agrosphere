"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AuthUser,
  FarmInput,
  PersistedRecommendation,
  ensureDefaultFarm,
  getAccessToken,
  listFarmRecommendations,
  listFarms,
  loginUser,
  logoutUser,
  persistedToRecommendationResponse,
  recommendForFarm,
  refreshSession,
  registerUser,
  setAccessToken,
  updateFarm,
  upsertSoil,
  getRecommendation,
  RecommendationResponse,
} from "@/lib/api";
import { markAskLocationAfterAuth, clearAskLocationAfterAuth } from "@/lib/locationPrompt";

export interface HistoryEntry {
  id: string;
  timestamp: string;
  top_crop: string;
  confidence_pct: string;
  drought_risk: string;
  soil_fertility_score: number;
  region: string;
  season: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  rainfall: number;
  temperature: number;
  humidity: number;
  soil_type: string;
  irrigation: number;
  explanation: string;
  tips: string[];
  climate_warning: string;
}

export interface User {
  id?: string;
  username: string;
  email: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  activeFarmId: string | null;
  history: HistoryEntry[];
  historyLoading: boolean;
  isAuthenticated: boolean;
  bootstrapped: boolean;
  /** Soft GPS prompt after a fresh login/register (not persisted). */
  pendingLocationPrompt: boolean;

  showLoginModal: boolean;
  showRegisterModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  setShowRegisterModal: (show: boolean) => void;
  clearPendingLocationPrompt: () => void;

  bootstrap: () => Promise<void>;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  loadHistory: () => Promise<void>;
  getHistory: () => HistoryEntry[];
  runRecommendation: (input: FarmInput) => Promise<RecommendationResponse>;
}

function toUser(u: AuthUser): User {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
  };
}

function mapPersisted(row: PersistedRecommendation): HistoryEntry {
  const snap = row.input_snapshot ?? {};
  const first = row.results?.[0];
  return {
    id: row.id,
    timestamp: row.created_at,
    top_crop: row.top_crop,
    confidence_pct: first?.confidence_pct ?? "—",
    drought_risk: row.drought_risk,
    soil_fertility_score: row.soil_fertility_score,
    region: String(snap.region ?? ""),
    season: String(snap.season ?? ""),
    nitrogen: Number(snap.nitrogen ?? 0),
    phosphorus: Number(snap.phosphorus ?? 0),
    potassium: Number(snap.potassium ?? 0),
    ph: Number(snap.ph ?? 0),
    rainfall: Number(snap.rainfall ?? 0),
    temperature: Number(snap.temperature ?? 0),
    humidity: Number(snap.humidity ?? 0),
    soil_type: String(snap.soil_type ?? ""),
    irrigation: Number(snap.irrigation ?? 0),
    explanation: row.explanation,
    tips: (row.tips as string[]) ?? [],
    climate_warning: row.climate_warning,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      activeFarmId: null,
      history: [],
      historyLoading: false,
      isAuthenticated: false,
      bootstrapped: false,
      pendingLocationPrompt: false,

      showLoginModal: false,
      showRegisterModal: false,
      setShowLoginModal: (show) => set({ showLoginModal: show }),
      setShowRegisterModal: (show) => set({ showRegisterModal: show }),
      clearPendingLocationPrompt: () => {
        clearAskLocationAfterAuth();
        set({ pendingLocationPrompt: false });
      },

      bootstrap: async () => {
        if (typeof window === "undefined") return;

        const token = get().accessToken;
        if (token) setAccessToken(token);

        try {
          // Prefer refresh cookie — renews access even if local token expired
          const data = await refreshSession();
          set({
            accessToken: data.access_token,
            user: toUser(data.user),
            isAuthenticated: true,
            showLoginModal: false,
            showRegisterModal: false,
          });
          const farms = await listFarms().catch(() => []);
          if (farms[0]) set({ activeFarmId: farms[0].id });
          await get().loadHistory();
        } catch {
          if (token) {
            // Stale token / no refresh cookie
            setAccessToken(null);
            set({
              user: null,
              accessToken: null,
              activeFarmId: null,
              history: [],
              isAuthenticated: false,
            });
          }
        } finally {
          set({ bootstrapped: true });
        }
      },

      login: async (username, password) => {
        try {
          const data = await loginUser(username, password);
          set({
            accessToken: data.access_token,
            user: toUser(data.user),
            isAuthenticated: true,
            showLoginModal: false,
          });
          const farms = await listFarms().catch(() => []);
          if (farms[0]) set({ activeFarmId: farms[0].id });
          await get().loadHistory();
          markAskLocationAfterAuth();
          set({ pendingLocationPrompt: true });
          return {
            success: true,
            message: `Welcome back, ${data.user.username}!`,
          };
        } catch (e) {
          return {
            success: false,
            message: e instanceof Error ? e.message : "Login failed",
          };
        }
      },

      register: async (username, email, password) => {
        try {
          const data = await registerUser(username, email, password);
          set({
            accessToken: data.access_token,
            user: toUser(data.user),
            isAuthenticated: true,
            showRegisterModal: false,
          });
          set({ activeFarmId: null, history: [] });
          markAskLocationAfterAuth();
          set({ pendingLocationPrompt: true });
          return { success: true, message: "Registration successful!" };
        } catch (e) {
          return {
            success: false,
            message: e instanceof Error ? e.message : "Registration failed",
          };
        }
      },

      logout: async () => {
        await logoutUser();
        clearAskLocationAfterAuth();
        set({
          user: null,
          accessToken: null,
          activeFarmId: null,
          history: [],
          isAuthenticated: false,
          pendingLocationPrompt: false,
        });
      },

      loadHistory: async () => {
        const { isAuthenticated, activeFarmId } = get();
        if (!isAuthenticated) {
          set({ history: [] });
          return;
        }

        set({ historyLoading: true });
        try {
          let farmId = activeFarmId;
          if (!farmId) {
            const farms = await listFarms();
            farmId = farms[0]?.id ?? null;
            set({ activeFarmId: farmId });
          }
          if (!farmId) {
            set({ history: [] });
            return;
          }
          const rows = await listFarmRecommendations(farmId);
          set({ history: rows.map(mapPersisted) });
        } catch {
          set({ history: [] });
        } finally {
          set({ historyLoading: false });
        }
      },

      getHistory: () => get().history,

      runRecommendation: async (input) => {
        const { isAuthenticated } = get();

        if (!isAuthenticated) {
          return getRecommendation(input);
        }

        // Ensure token is in module scope (persist hydrate)
        const token = get().accessToken;
        if (token && !getAccessToken()) setAccessToken(token);

        const farm = await ensureDefaultFarm(input.region);
        // Prefer explicit coords from the form; else reuse confirmed farm pin
        let latitude = input.latitude;
        let longitude = input.longitude;
        if (latitude != null && longitude != null) {
          await updateFarm(farm.id, {
            latitude,
            longitude,
            region: input.region,
          }).catch(() => undefined);
        } else if (farm.latitude != null && farm.longitude != null) {
          latitude = farm.latitude;
          longitude = farm.longitude;
        }
        set({ activeFarmId: farm.id });

        const { region: _r, language: _l, ...soil } = input;
        await upsertSoil(farm.id, {
          nitrogen: soil.nitrogen,
          phosphorus: soil.phosphorus,
          potassium: soil.potassium,
          ph: soil.ph,
          rainfall: soil.rainfall,
          temperature: soil.temperature,
          humidity: soil.humidity,
          soil_type: soil.soil_type,
          season: soil.season,
          irrigation: soil.irrigation,
        });

        const row = await recommendForFarm(farm.id, {
          ...input,
          latitude,
          longitude,
          use_live_weather: input.use_live_weather ?? true,
        });
        const mapped = mapPersisted(row);
        set({ history: [mapped, ...get().history.filter((h) => h.id !== mapped.id)] });

        return persistedToRecommendationResponse(row);
      },
    }),
    {
      name: "agrosphere-auth-v2",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        activeFarmId: state.activeFarmId,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
      },
    }
  )
);
