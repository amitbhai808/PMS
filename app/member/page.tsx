"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Wallet,
  Car,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { apiGet, apiDelete } from "@/lib/client-api";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast";
import { Booking } from "@/components/parking/booking-row";

type WalletData = {
  wallet: {
    id: string;
    balancePaise: number;
    balance: number;
    currency: string;
  };
};

type Vehicle = {
  licensePlate: string;
  type: string;
};

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [wallet, setWallet] = useState<WalletData["wallet"] | null>(null);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [bookingsRes, vehiclesRes, walletRes] = await Promise.all([
      apiGet<{ bookings: Booking[] }>("/api/bookings?take=20"),
      apiGet<{ vehicles: Vehicle[] }>("/api/member/register-vehicle"),
      apiGet<WalletData>("/api/wallet"),
    ]);

    if (bookingsRes.ok) setBookings(bookingsRes.data.bookings);
    if (vehiclesRes.ok) setVehicles(vehiclesRes.data.vehicles);
    if (walletRes.ok) setWallet(walletRes.data.wallet);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelReservation = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;

    const res = await apiDelete(`/api/parking/reserve/${bookingId}`);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }

    toast("Reservation cancelled successfully", "success");
    await loadData();
  };

  const activeOrPending = bookings.filter(
    (b) => b.status === "ACTIVE" || b.status === "PENDING"
  );
  const pastBookings = bookings.filter(
    (b) => b.status === "COMPLETED" || b.status === "CANCELLED"
  );

  const statusClass = (status: Booking["status"]) =>
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "PENDING"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "COMPLETED"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-neutral-100 text-neutral-600 border-neutral-300";

  return (
    <div>
      {/* Welcome Banner */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Welcome back, {user?.name ?? "Member"}
        </h1>
        <p className="max-w-xl text-xs leading-5 text-neutral-500 mt-1">
          Manage your registered vehicles, bay reservations, and contactless digital wallet
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Wallet Balance */}
        <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Wallet Balance</span>
            <Wallet size={18} className="text-emerald-700" />
          </div>
          <div className="text-2xl font-bold tracking-tight mt-2 text-emerald-800">
            ₹{wallet?.balance.toFixed(2) ?? "0.00"}
            {/* ₹192.42 */}
          </div>
          <div className="text-xs mt-1.5">
            <Link href="/member/wallet" className="text-emerald-700 font-semibold hover:underline">
              Add funds / View history →
            </Link>
          </div>
        </div>

        {/* Registered Vehicles */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Registered Vehicles</span>
            <Car size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight mt-2 text-neutral-800">{vehicles.length}</div>
          <div className="text-xs mt-1.5">
            <Link href="/member/vehicles" className="text-blue-700 font-semibold hover:underline">
              Manage vehicle plates →
            </Link>
          </div>
        </div>

        {/* Active Reservations */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Active / Upcoming</span>
            <CalendarCheck size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight mt-2 text-neutral-800">{activeOrPending.length}</div>
          <div className="text-xs mt-1.5">
            <Link href="/member/reserve" className="text-purple-700 font-semibold hover:underline">
              Book a new reservation →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7 sm:mb-8">
        <Link
          href="/member/reserve"
          className="min-h-20 p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 transition-colors flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
              <CalendarCheck size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950">Reserve Parking Bay</div>
              <div className="text-[11px] text-emerald-800">Guaranteed slot with 30m buffer</div>
            </div>
          </div>
          <ArrowRight size={16} className="text-emerald-700" />
        </Link>

        <Link
          href="/member/vehicles"
          className="min-h-20 p-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <Car size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">Register Vehicle</div>
              <div className="text-[11px] text-neutral-500">Enable fast automatic ANPR gate access</div>
            </div>
          </div>
          <ArrowRight size={16} className="text-neutral-400" />
        </Link>

        <Link
          href="/member/wallet"
          className="min-h-20 p-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">Top Up Wallet</div>
              <div className="text-[11px] text-neutral-500">Contactless automatic checkout deduction</div>
            </div>
          </div>
          <ArrowRight size={16} className="text-neutral-400" />
        </Link>
      </div>

      {/* Active & Upcoming Sessions */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 mb-8 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Active & Upcoming Sessions</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Current on-site visits and pre-booked bays</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 px-6 text-neutral-400 flex flex-col items-center justify-center">
            <Loader2 size={24} className="animate-spin text-neutral-400 mb-2" />
            <p className="text-xs text-neutral-500">Loading your sessions…</p>
          </div>
        ) : activeOrPending.length === 0 ? (
          <div className="text-center py-10 px-6 text-neutral-400 flex flex-col items-center justify-center">
            <CalendarCheck size={32} />
            <h3 className="text-sm font-semibold text-neutral-800 mt-2 mb-1">No Active Bookings</h3>
            <p className="text-xs text-neutral-500">You don&apos;t have any vehicles parked or reserved right now.</p>
          </div>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {activeOrPending.map((b) => (
              <article key={b.id} className="rounded-lg border border-neutral-200 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono font-bold text-xs px-2 py-1 rounded bg-neutral-100 border border-neutral-300">{b.licensePlate}</span>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusClass(b.status)}`}>{b.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Bay</p><p className="mt-0.5 font-semibold text-emerald-800">{b.slot?.code ?? "Allocated at Gate"}</p>{b.slot?.zone && <p className="text-[11px] text-neutral-500">{b.slot.zone.name}</p>}</div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Schedule</p><p className="mt-0.5 font-medium text-neutral-800">{new Date(b.expectedEntry).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p><p className="text-[11px] text-neutral-500">to {new Date(b.expectedExit).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                </div>
                {b.status === "PENDING" && <button type="button" onClick={() => handleCancelReservation(b.id)} className="mt-3 min-h-9 w-full text-xs text-red-700 hover:text-red-800 font-semibold border border-red-200 rounded-md bg-red-50/50 cursor-pointer">Cancel reservation</button>}
                {b.status === "ACTIVE" && <p className="mt-3 text-xs text-emerald-700 font-semibold">Currently parked</p>}
              </article>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Vehicle Plate</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Assigned Bay</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Scheduled Window</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Status</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {activeOrPending.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="p-2.5 sm:px-3 align-middle">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300">
                        {b.licensePlate}
                      </span>
                    </td>
                    <td className="p-2.5 sm:px-3 align-middle">
                      <span className="font-bold text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {b.slot?.code ?? "Allocated at Gate"}
                      </span>
                      {b.slot?.zone && (
                        <div className="text-[11px] text-neutral-500 mt-0.5">{b.slot.zone.name}</div>
                      )}
                    </td>
                    <td className="p-2.5 sm:px-3 align-middle">
                      <div className="text-xs">
                        <div>Entry: <strong>{new Date(b.expectedEntry).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</strong></div>
                        <div className="text-neutral-500">Exit: {new Date(b.expectedExit).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </td>
                    <td className="p-2.5 sm:px-3 align-middle">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusClass(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-2.5 sm:px-3 align-middle">
                      {b.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => handleCancelReservation(b.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 rounded px-2 py-1 bg-red-50/50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      {b.status === "ACTIVE" && (
                        <span className="text-xs text-emerald-700 font-medium">Currently Parked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Past Completed Visits */}
      {pastBookings.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Completed Parking History</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Past visits and settlements</p>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {pastBookings.map((b) => (
              <article key={b.id} className="rounded-lg border border-neutral-200 p-3.5">
                <div className="flex items-start justify-between gap-3"><span className="font-mono font-bold text-xs">{b.licensePlate}</span><span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusClass(b.status)}`}>{b.status}</span></div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Bay</p><p className="mt-0.5 font-semibold text-neutral-800">{b.slot?.code ?? "—"}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Total paid</p><p className="mt-0.5 font-semibold text-neutral-900">{b.totalPaidPaise > 0 ? `₹${(b.totalPaidPaise / 100).toFixed(2)}` : "—"}</p></div></div>
                <p className="mt-3 text-[11px] text-neutral-500">{new Date(b.actualExit ?? b.expectedExit).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</p>
              </article>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Vehicle Plate</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Bay</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Date & Duration</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Total Paid</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pastBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="p-2.5 sm:px-3 align-middle">
                      <span className="font-mono text-xs">{b.licensePlate}</span>
                    </td>
                    <td className="p-2.5 sm:px-3 align-middle">{b.slot?.code ?? "—"}</td>
                    <td className="p-2.5 sm:px-3 align-middle">
                      <span className="text-xs text-neutral-700">
                        {new Date(b.actualExit ?? b.expectedExit).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                    <td className="p-2.5 sm:px-3 align-middle">
                      <span className="text-xs font-semibold text-neutral-900">
                        {b.totalPaidPaise > 0 ? `₹${(b.totalPaidPaise / 100).toFixed(2)}` : "—"}
                      </span>
                    </td>
                    <td className="p-2.5 sm:px-3 align-middle">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusClass(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
