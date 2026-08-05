"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  accounts: Record<string, string>; // username -> password
  userEmails: Record<string, string>; // username -> email
  userHistory: Record<string, HistoryEntry[]>; // username -> history
  isAuthenticated: boolean;
  
  // UI Global Modal States
  showLoginModal: boolean;
  showRegisterModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  setShowRegisterModal: (show: boolean) => void;
  
  // Actions
  login: (username: string, password: string) => { success: boolean; message: string };
  register: (username: string, email: string, password: string) => { success: boolean; message: string };
  logout: () => void;
  addHistoryEntry: (entry: Omit<HistoryEntry, "id" | "timestamp">) => void;
  getHistory: () => HistoryEntry[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accounts: {},
      userEmails: {},
      userHistory: {},
      isAuthenticated: false,
      
      showLoginModal: false,
      showRegisterModal: false,
      setShowLoginModal: (show) => set({ showLoginModal: show }),
      setShowRegisterModal: (show) => set({ showRegisterModal: show }),

      login: (username, password) => {
        const uLower = username.toLowerCase().trim();
        const storedPassword = get().accounts[uLower];
        
        if (!storedPassword) {
          return { success: false, message: "Username not found. Please register." };
        }
        
        if (storedPassword !== password) {
          return { success: false, message: "Incorrect password." };
        }
        
        const email = get().userEmails[uLower] || "";
        
        set({
          user: { username: username.trim(), email },
          isAuthenticated: true,
          showLoginModal: false, // close modal on success
        });
        
        return { success: true, message: `Welcome back, ${username}!` };
      },

      register: (username, email, password) => {
        const uTrim = username.trim();
        const uLower = uTrim.toLowerCase();
        
        if (!uTrim || !email || !password) {
          return { success: false, message: "All fields are required." };
        }
        
        if (get().accounts[uLower]) {
          return { success: false, message: "Username is already taken." };
        }
        
        // Save account credentials and email
        const newAccounts = { ...get().accounts, [uLower]: password };
        const newEmails = { ...get().userEmails, [uLower]: email.trim() };
        
        set({
          accounts: newAccounts,
          userEmails: newEmails,
          user: { username: uTrim, email: email.trim() },
          isAuthenticated: true,
          showRegisterModal: false, // close modal on success
        });
        
        return { success: true, message: "Registration successful!" };
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      addHistoryEntry: (entry) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const uLower = currentUser.username.toLowerCase();
        const newEntry: HistoryEntry = {
          ...entry,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
        };
        
        const currentHistory = get().userHistory[uLower] || [];
        const updatedHistory = [newEntry, ...currentHistory];
        
        set({
          userHistory: {
            ...get().userHistory,
            [uLower]: updatedHistory,
          },
        });
      },

      getHistory: () => {
        const currentUser = get().user;
        if (!currentUser) return [];
        return get().userHistory[currentUser.username.toLowerCase()] || [];
      },
    }),
    {
      name: "agrosphere-auth-storage",
      partialize: (state) => ({
        user: state.user,
        accounts: state.accounts,
        userEmails: state.userEmails,
        userHistory: state.userHistory,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
