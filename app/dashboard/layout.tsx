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
      className={`dash-nav-link ${isActive ? "active" : ""}`}
    >
      <item.icon size={17} />
      <span>{item.label}</span>
      {isActive && <span className="dash-nav-indicator" />}
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
      <main className="dash-loading">
        <Loader2 size={32} className="spin" />
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
    <div className="dash-shell">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        {/* parking logo  */}
        <Link href="/dashboard" className="dash-brand">
          <span className="dash-brand-mark">
            <CarFront size={20} />
          </span>
          <span className="dash-brand-text">
            <strong>Parkwise</strong>
            <small>SMART PARKING</small>
          </span>
        </Link>

        <div className="dash-nav-section">
          <div className="dash-nav-label">WORKSPACE</div>
          <nav aria-label="Workspace navigation">
            {workspaceNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>

        <div className="dash-nav-section">
          <div className="dash-nav-label">OPERATIONS</div>
          <nav aria-label="Operations navigation">
            {operationsNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>

        {isSuperAdmin && (
          <div className="dash-nav-section">
            <div className="dash-nav-label">ADMIN</div>
            <nav aria-label="Admin navigation">
              {adminNav
                .filter((item) => !item.roles || item.roles.includes(user.role))
                .map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
            </nav>
          </div>
        )}

        <div className="dash-sidebar-bottom">
          <div className="dash-user-card">
            <span className="dash-avatar">
              {(user?.name || "User").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <span className="dash-user-info">
              <strong>{user?.name || "User"}</strong>
              <small>{(user?.role || "OPERATOR").replace("SUPERADMIN", "Super Admin")}</small>
            </span>
            <button onClick={logout} className="dash-logout-btn" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="dash-main">
        <header className="dash-topbar">
          <div className="dash-breadcrumb">
            Dashboard <span>/</span> <strong>{breadcrumbLabel}</strong>
          </div>
          <div className="dash-topbar-right">
            <span className="dash-env-pill">
              <i /> DEVELOPMENT
            </span>
            <button onClick={logout} className="dash-topbar-logout" title="Sign out">
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <div className="dash-page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
