"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import Sidebar from "@/components/admin_dashboards/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("parkwise_sidebar_collapsed");
    if (saved !== null) setIsCollapsed(saved === "true");
    else if (window.innerWidth < 768) setIsCollapsed(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user?.role === "MEMBER") router.push("/member");
  }, [loading, user, router]);

  const toggleSidebar = () => {
    setIsCollapsed((previous) => {
      const next = !previous;
      localStorage.setItem("parkwise_sidebar_collapsed", String(next));
      return next;
    });
  };

  if (loading) {
    return <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-neutral-400">
      <Loader2 size={32} className="animate-spin text-emerald-700" />
      <p>Loading dashboard…</p>
    </main>;
  }

  if (!user || user.role === "MEMBER") return null;

  const pathSegments = pathname.replace("/dashboard", "").split("/").filter(Boolean);
  const breadcrumbLabel = pathSegments.length > 0
    ? pathSegments[pathSegments.length - 1].replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
    : "Overview";

  return <div className="flex h-dvh overflow-hidden bg-[#f7f9f7] text-[#1b2824]">
    <Sidebar user={user} pathname={pathname} isCollapsed={isCollapsed} onToggle={toggleSidebar} onLogout={() => void logout()} />

    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-7 max-md:px-4">
        <div className="flex items-center gap-2.5 text-xs text-neutral-400">
          <button type="button" onClick={toggleSidebar} className="-ml-1.5 cursor-pointer rounded-lg border border-transparent p-1.5 text-neutral-400 transition-colors hover:border-neutral-200 hover:bg-neutral-100 hover:text-neutral-700" title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <span className="text-neutral-300">/</span>
          <span>Dashboard</span>
          <span className="text-neutral-300">/</span>
          <strong className="font-semibold text-neutral-700">{breadcrumbLabel}</strong>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded bg-neutral-100 px-2.5 py-1.5 text-[9px] font-bold tracking-wider text-neutral-500">
            <i className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> DEVELOPMENT
          </span>
          <button onClick={() => void logout()} className="flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600" title="Sign out">
            <LogOut size={14} /><span>Sign out</span>
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-7 max-md:p-4">{children}</main>
    </div>
  </div>;
}
