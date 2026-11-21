"use client";

import Link from "next/link";
import {
  Activity, AlertTriangle, ArrowRightLeft, CarFront, CircleDollarSign, DoorClosed,
  DoorOpen, FileText, Layers3, LogOut, MapPin, PanelLeftClose, PanelLeftOpen,
  ShieldAlert, Users, Wrench,
} from "lucide-react";
import type { AuthUser } from "@/components/auth-provider";

type NavItem = { label: string; href: string; icon: typeof Activity; roles?: AuthUser["role"][] };
type SidebarProps = { user: AuthUser; pathname: string; isCollapsed: boolean; onToggle: () => void; onLogout: () => void };

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

function NavLink({ item, pathname, isCollapsed }: Pick<SidebarProps, "pathname" | "isCollapsed"> & { item: NavItem }) {
  const isActive = pathname === item.href;
  return <Link href={item.href} title={isCollapsed ? item.label : undefined}
    className={`relative flex min-h-[38px] items-center rounded-lg text-[13px] font-medium transition-colors ${isCollapsed ? "mx-auto h-10 w-10 justify-center px-0" : "gap-2.5 px-3"} ${isActive ? "bg-pine-600 text-pine-50 font-semibold" : "text-pine-50/75 hover:bg-pine-50/15 hover:text-pine-50"}`}>
    <item.icon size={18} className="shrink-0" />
    {!isCollapsed && <span className="truncate">{item.label}</span>}
    {isActive && !isCollapsed && <span className="absolute -right-5 top-2 h-[22px] w-[3px] rounded-l bg-pine-50" />}
  </Link>;
}

function NavigationSection({ label, items, pathname, isCollapsed }: Pick<SidebarProps, "pathname" | "isCollapsed"> & { label: string; items: NavItem[] }) {
  return <section className="mb-2">
    {isCollapsed ? <div className="mx-1 my-2 h-px bg-pine-50/20" /> : <h2 className="px-3 py-1.5 text-[9px] font-extrabold tracking-wider text-pine-300">{label}</h2>}
    <nav aria-label={`${label} navigation`} className="grid gap-0.5">
      {items.map((item) => <NavLink key={item.href} item={item} pathname={pathname} isCollapsed={isCollapsed} />)}
    </nav>
  </section>;
}

export default function Sidebar({ user, pathname, isCollapsed, onToggle, onLogout }: SidebarProps) {
  const visibleAdminNav = adminNav.filter((item) => !item.roles || item.roles.includes(user.role));
  const initials = user.name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
  return <aside className={`${isCollapsed ? "w-[72px] p-3" : "w-[250px] p-5"} flex h-dvh shrink-0 flex-col overflow-hidden border-r border-pine-50/15 bg-pine-700 pt-5 pb-4 text-pine-50 transition-[width,padding] duration-200 select-none`}>
    <div className={isCollapsed ? "flex flex-col items-center gap-2.5 pb-5" : "flex items-center justify-between px-1 pb-6"}>
      <Link href="/dashboard" className={isCollapsed ? "flex items-center justify-center group" : "flex items-center gap-2.5 group"} title={isCollapsed ? "Parkwise Dashboard" : undefined}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-700/20 transition-colors group-hover:bg-emerald-800"><CarFront size={20} /></span>
        {!isCollapsed && <span><strong className="block text-base leading-tight tracking-tight text-pine-50 font-bold">Parkwise</strong><small className="mt-0.5 block text-[8px] font-bold tracking-[1.45px] text-pine-300">SMART PARKING</small></span>}
      </Link>
      <button type="button" onClick={onToggle} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-transparent text-pine-300 transition-colors hover:border-pine-50/20 hover:bg-pine-50/15 hover:text-pine-50" title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
      <NavigationSection label="WORKSPACE" items={workspaceNav} pathname={pathname} isCollapsed={isCollapsed} />
      <NavigationSection label="OPERATIONS" items={operationsNav} pathname={pathname} isCollapsed={isCollapsed} />
      {visibleAdminNav.length > 0 && <NavigationSection label="ADMIN" items={visibleAdminNav} pathname={pathname} isCollapsed={isCollapsed} />}
    </div>

    <div className="mt-3 shrink-0 border-t border-pine-50/20 pt-3">
      <div className={isCollapsed ? "flex flex-col items-center gap-2 py-1" : "flex items-center gap-2 px-1.5 py-2"}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pine-50 text-[11px] font-extrabold text-pine-900" title={`${user.name} (${user.role.replace("SUPERADMIN", "Super Admin")})`}>{initials}</span>
        {!isCollapsed && <span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold text-pine-50">{user.name}</strong><small className="block text-[10px] capitalize text-pine-300">{user.role.replace("SUPERADMIN", "Super Admin")}</small></span>}
        <button type="button" onClick={onLogout} className="grid cursor-pointer place-items-center rounded-md p-1.5 text-pine-300 transition-colors hover:bg-red-50/15 hover:text-red-200" title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
      </div>
    </div>
  </aside>;
}
