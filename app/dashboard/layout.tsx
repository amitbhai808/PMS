"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  CarFront,
  CircleDollarSign,
  Layers3,
  LogOut,
  Loader2,
  Settings,
  ShieldAlert,
  Wrench,
  ArrowRightLeft,
  AlertTriangle,
  Users,
  MapPin,
  FileText,
  DoorOpen,
  DoorClosed,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Activity;
  roles?: ("SUPERADMIN" | "OPERATOR" | "MEMBER")[];
};

const workspaceNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: Activity },
  { label: "Parking Layout", href: "/dashboard/slots", icon: Layers3 },
  { label: "Bookings", href: "/dashboard/bookings", icon: CarFront },
  { label: "Entry Gate", href: "/dashboard/entry", icon: DoorOpen },
  { label: "Exit Gate", href: "/dashboard/exit", icon: DoorClosed },
];

const operationsNav: NavItem[] = [
  { label: "Slot Override", href: "/dashboard/override", icon: ShieldAlert },
  { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
  { label: "Reassign Booking", href: "/dashboard/reassign", icon: ArrowRightLeft },
  { label: "Overstay Alerts", href: "/dashboard/overstay", icon: AlertTriangle },
];

const adminNav: NavItem[] = [
  { label: "Revenue", href: "/dashboard/revenue", icon: CircleDollarSign, roles: ["SUPERADMIN"] },
  { label: "Users", href: "/dashboard/users", icon: Users, roles: ["SUPERADMIN"] },
  { label: "Zones", href: "/dashboard/zones", icon: MapPin, roles: ["SUPERADMIN"] },
  { label: "Audit Log", href: "/dashboard/audit", icon: FileText, roles: ["SUPERADMIN"] },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href;
  return (
    <Link
      href={item.href}
      className={`relative min-h-[38px] flex gap-2.5 items-center px-3 text-[13px] font-medium rounded-lg transition-colors max-md:justify-center max-md:px-0 ${
        isActive
          ? "bg-emerald-50 text-emerald-700 font-semibold"
          : "text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-900"
      }`}
    >
      <item.icon size={17} />
      <span className="max-md:hidden">{item.label}</span>
      {isActive && (
        <span className="absolute -right-3.5 top-2 h-[22px] w-[3px] rounded-l bg-emerald-700 max-md:hidden" />
      )}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    // If a MEMBER somehow navigates to /dashboard, redirect to /member
    if (!loading && user?.role === "MEMBER") {
      router.push("/member");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 text-neutral-400 text-sm">
        <Loader2 size={32} className="animate-spin text-emerald-700" />
        <p>Loading dashboard…</p>
      </main>
    );
  }

  if (!user || user.role === "MEMBER") {
    return null;
  }

  const isSuperAdmin = user.role === "SUPERADMIN";

  // Breadcrumb from pathname
  const pathSegments = pathname.replace("/dashboard", "").split("/").filter(Boolean);
  const breadcrumbLabel = pathSegments.length > 0
    ? pathSegments[pathSegments.length - 1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Overview";

  return (
    <div className="min-h-screen flex bg-[#f7f9f7] text-[#1b2824]">
      {/* Sidebar */}
      <aside className="w-[250px] shrink-0 bg-white border-r border-neutral-200 flex flex-col p-6 pt-6 pb-4 overflow-y-auto max-md:w-16 max-md:p-3 max-md:pt-5">
        {/* parking logo  */}
        <Link href="/dashboard" className="flex items-center gap-2.5 pb-8 px-2 max-md:justify-center max-md:pb-6">
          <span className="w-9 h-9 rounded-xl text-white grid place-items-center bg-emerald-700 shadow-md shadow-emerald-700/20 shrink-0">
            <CarFront size={20} />
          </span>
          <span className="max-md:hidden">
            <strong className="block text-base tracking-tight leading-tight text-neutral-800 font-bold">Parkwise</strong>
            <small className="block text-neutral-400 font-bold tracking-[1.45px] text-[8px] mt-0.5">SMART PARKING</small>
          </span>
        </Link>

        <div className="mb-2">
          <div className="text-neutral-400 text-[9px] font-extrabold tracking-wider px-3 py-2 max-md:hidden">WORKSPACE</div>
          <nav aria-label="Workspace navigation" className="grid gap-0.5">
            {workspaceNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>

        <div className="mb-2">
          <div className="text-neutral-400 text-[9px] font-extrabold tracking-wider px-3 py-2 max-md:hidden">OPERATIONS</div>
          <nav aria-label="Operations navigation" className="grid gap-0.5">
            {operationsNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>

        {isSuperAdmin && (
          <div className="mb-2">
            <div className="text-neutral-400 text-[9px] font-extrabold tracking-wider px-3 py-2 max-md:hidden">ADMIN</div>
            <nav aria-label="Admin navigation" className="grid gap-0.5">
              {adminNav
                .filter((item) => !item.roles || item.roles.includes(user.role))
                .map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
            </nav>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-neutral-200 max-md:border-t-0">
          <div className="flex items-center gap-2 px-1.5 py-2 max-md:justify-center">
            <span className="grid place-items-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold shrink-0">
              {(user?.name || "User").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1 min-w-0 max-md:hidden">
              <strong className="block text-xs text-neutral-800 truncate font-semibold">{user?.name || "User"}</strong>
              <small className="block text-neutral-400 text-[10px] capitalize">{(user?.role || "OPERATOR").replace("SUPERADMIN", "Super Admin")}</small>
            </span>
            <button onClick={logout} className="cursor-pointer text-neutral-400 p-1.5 rounded-md grid place-items-center hover:text-red-600 hover:bg-red-50 transition-colors max-md:hidden" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[60px] bg-white border-b border-neutral-200 flex items-center justify-between px-7 shrink-0 max-md:px-4">
          <div className="text-neutral-400 text-xs flex items-center gap-2">
            Dashboard <span className="text-neutral-300">/</span> <strong className="text-neutral-700 font-semibold">{breadcrumbLabel}</strong>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[9px] text-neutral-500 font-bold tracking-wider bg-neutral-100 px-2.5 py-1.5 rounded">
              <i className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block" /> DEVELOPMENT
            </span>
            <button onClick={logout} className="flex items-center gap-1.5 border border-neutral-200 rounded-md px-2.5 py-1.5 cursor-pointer text-neutral-600 text-xs font-medium hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors" title="Sign out">
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-7 overflow-y-auto max-md:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
