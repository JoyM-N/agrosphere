"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Leaf, LayoutDashboard, Sprout, CloudRain, Bot,
  Bell, TrendingUp, LogOut, Menu, X, Home, MapPin,
} from "lucide-react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { toast } from "sonner";

const NAV = [
  { label: "Overview", href: "/hub", icon: Home },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Farm location", href: "/location", icon: MapPin },
  { label: "Recommendations", href: "/recommend", icon: Sprout },
  { label: "Weather", href: "/weather", icon: CloudRain },
  { label: "Assistant", href: "/assistant", icon: Bot, soon: true },
  { label: "Alerts", href: "/alerts", icon: Bell, soon: true },
  { label: "Economics", href: "/economics", icon: TrendingUp, soon: true },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  soon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  soon?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href !== "/hub" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
      style={{
        background: active ? "rgba(229,139,25,0.12)" : "transparent",
        color: active ? "#C56F10" : "#6B5B49",
        border: active ? "1px solid rgba(229,139,25,0.25)" : "1px solid transparent",
      }}
    >
      <Icon size={17} />
      <span className="flex-1">{label}</span>
      {soon && (
        <span
          className="text-[0.6rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
          style={{
            background: "rgba(163,150,134,0.15)",
            color: "#A39686",
          }}
        >
          Soon
        </span>
      )}
    </Link>
  );
}

export default function AppSidebar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    router.push("/");
  };

  const sidebarBody = (
    <div className="flex h-full flex-col" style={{ background: "#FDFBF7" }}>
      <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: "#E3DAC9" }}>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, #E58B19, #F2A63B)" }}
        >
          <Leaf size={18} color="white" />
        </div>
        <div>
          <div className="text-sm font-black tracking-tight" style={{ color: "#2C2010" }}>
            AgroSphere
          </div>
          <div className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: "#A39686" }}>
            Farm OS
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      <div className="border-t px-4 py-4" style={{ borderColor: "#E3DAC9" }}>
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold uppercase"
            style={{ background: "#E58B19", color: "#FDFBF7" }}
          >
            {user?.username?.[0] ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold" style={{ color: "#2C2010" }}>
              {user?.username}
            </div>
            <div className="truncate text-[0.7rem]" style={{ color: "#A39686" }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
          style={{
            border: "1px solid #E3DAC9",
            color: "#6B5B49",
            background: "white",
          }}
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between px-4 md:hidden"
        style={{
          background: "rgba(253,251,247,0.92)",
          borderBottom: "1px solid #E3DAC9",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-2">
          <Leaf size={18} color="#E58B19" />
          <span className="font-black text-sm" style={{ color: "#2C2010" }}>
            AgroSphere
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ border: "1px solid #E3DAC9", color: "#6B5B49" }}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r md:block"
        style={{ borderColor: "#E3DAC9" }}
      >
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute left-0 top-0 h-full w-[min(18rem,85vw)] shadow-2xl"
            style={{ background: "#FDFBF7" }}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ color: "#A39686" }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            {sidebarBody}
          </div>
        </div>
      )}
    </>
  );
}
