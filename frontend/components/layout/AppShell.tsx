"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/useAuthStore";
import AppSidebar from "@/components/layout/AppSidebar";
import LocationPermissionPrompt from "@/components/location/LocationPermissionPrompt";
import { Leaf } from "lucide-react";

/**
 * Authenticated product shell: sidebar + main content.
 * Redirects guests to /auth.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, bootstrapped } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for auth hydrate/bootstrap so we don't flash-redirect
    if (!bootstrapped) return;
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    setReady(true);
  }, [bootstrapped, isAuthenticated, router]);

  if (!ready) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#F7F4EB" }}
      >
        <div className="text-center">
          <Leaf size={28} color="#E58B19" className="mx-auto mb-3 animate-pulse" />
          <p style={{ color: "#A39686", fontSize: "0.9rem" }}>Loading AgroSphere…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F4EB" }}>
      <AppSidebar />
      <main className="min-h-screen pt-14 md:pt-0 md:pl-64">
        {children}
      </main>
      <LocationPermissionPrompt />
    </div>
  );
}
