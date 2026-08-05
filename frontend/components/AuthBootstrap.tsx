"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";

/** Restores session from refresh cookie / persisted access token on app load. */
export default function AuthBootstrap() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return null;
}
