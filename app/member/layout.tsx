"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  CarFront,
  Car,
  CalendarCheck,
  Wallet,
  LogOut,
  Loader2,
  ShieldAlert,
  ArrowRight,
  User,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const memberNav = [
  { label: "My Dashboard", href: "/member", icon: CarFront },
  { label: "Reserve Bay", href: "/member/reserve", icon: CalendarCheck },
  { label: "My Vehicles", href: "/member/vehicles", icon: Car },
  { label: "My Wallet", href: "/member/wallet", icon: Wallet },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 text-neutral-400 text-sm">
        <Loader2 size={32} className="animate-spin text-emerald-700" />
        <p>Loading member portal…</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const isStaff = user.role === "OPERATOR" || user.role === "SUPERADMIN";

  return (
    <div className="min-h-screen bg-[#f7f9f7] flex flex-col">
      {/* Member Navbar */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4 sm:gap-8">
            <Link href="/member" className="flex items-center gap-2.5 text-neutral-900 no-underline">
              <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <CarFront size={18} />
              </span>
              <div className="hidden min-[380px]:block">
                <strong className="block text-sm font-bold tracking-tight">Parkwise</strong>
                <small className="block text-[9px] font-bold text-neutral-400 tracking-wider uppercase -mt-0.5">
                  Member Portal
                </small>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {memberNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800 font-semibold"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                    }`}
                  >
                    <item.icon size={15} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isStaff && (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors"
              >
                <span>Operator Dashboard</span>
                <ArrowRight size={12} />
              </Link>
            )}

            {/* avtar , name , logout button  */}
            <div className="flex shrink-0 items-center gap-2 pl-2 sm:pl-3 border-l border-neutral-200">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                {(user?.name || "Member").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden sm:block text-xs font-semibold text-neutral-800">
                {user?.name || "Member"}
              </span>
              <button
                onClick={logout}
                className="p-1.5 text-neutral-400 hover:text-red-600 rounded-md transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <nav aria-label="Member navigation" className="md:hidden border-t border-neutral-100 flex overflow-x-auto px-4 py-1.5 gap-1.5 [scrollbar-width:none]">
          {memberNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 font-semibold"
                    : "text-neutral-600"
                }`}
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 flex-1">
        {children}
      </main>
    </div>
  );
}
