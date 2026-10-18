"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RefreshCw,
  DoorClosed,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  CarFront,
  Loader2,
} from "lucide-react";
import { apiGet } from "@/lib/client-api";
import { Booking } from "@/components/parking/booking-row";
import { OverstayBadge } from "@/components/parking/overstay-badge";

export default function OverstayAlertsPage() {
  const [overstayBookings, setOverstayBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const loadOverstays = useCallback(async () => {
    setRefreshing(true);
    const res = await apiGet<{ bookings: Booking[] }>("/api/bookings/overstay");
    if (res.ok) {
      setOverstayBookings(res.data.bookings);
    }
    setLastCheck(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadOverstays();
    // Re-check every 30 seconds
    const interval = setInterval(loadOverstays, 30_000);
    return () => clearInterval(interval);
  }, [loadOverstays]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">Overstay & Violation Watch</h1>
            {overstayBookings.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                {overstayBookings.length} Alert{overstayBookings.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">Real-time monitor of active parked vehicles that have exceeded their expected exit times</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 flex items-center gap-1">
            <Clock size={13} /> {lastCheck.toLocaleTimeString()}
          </span>
          <button
            onClick={loadOverstays}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Checking…" : "Check Overstays"}</span>
          </button>
        </div>
      </div>

      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-red-50/60 to-white border border-red-200/70 rounded-xl p-4 mb-6 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 text-red-700">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900 mb-1">
              Automated Overstay Penalty Policy Active
            </h3>
            <p className="text-xs text-red-800/80 leading-relaxed">
              Vehicles parked beyond their scheduled departure incur incremental overtime surcharge rate
              (1.5x base hourly tier) computed down to the minute upon departure. Operators can dispatch
              bay checks or assist drivers at the exit gate.
            </p>
          </div>
        </div>
      </div>

      {/* Overstay Records Table */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Vehicles Past Expected Departure</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Sorted by longest overdue first</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 px-6 text-neutral-400 flex flex-col items-center justify-center">
            <Loader2 size={24} className="animate-spin text-neutral-400 mb-2" />
            <p className="text-xs text-neutral-500">Scanning facility bays for overstays…</p>
          </div>
        ) : overstayBookings.length === 0 ? (
          <div className="text-center py-14 px-6 text-neutral-400 flex flex-col items-center justify-center">
            <CheckCircle2 size={36} className="text-emerald-600 mb-2" />
            <h3 className="text-sm font-semibold text-neutral-800 mt-2 mb-1">Zero Overstay Violations</h3>
            <p className="text-xs text-neutral-500">All vehicles currently parked inside the facility are within their permitted parking windows.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Vehicle Plate</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Bay Location</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Scheduled Departure</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Overdue Duration</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Base Rate</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Gate Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {overstayBookings.map((b) => (
                  <tr key={b.id} className="bg-red-50/40 hover:bg-red-50/70 transition-colors">
                    <td className="p-2.5 sm:px-3 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tracking-wider text-sm px-2 py-0.5 rounded bg-white border border-red-200 text-red-900 shadow-2xs">
                          {b.licensePlate}
                        </span>
                        {b.vehicle && (
                          <span className="text-[10px] text-neutral-500 uppercase">
                            {b.vehicle.type.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-2.5 sm:px-3 align-middle">
                      <span className="font-bold text-xs px-2 py-0.5 rounded bg-white border border-neutral-200">
                        {b.slot?.code ?? "—"}
                      </span>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {b.slot?.zone?.name ?? `Level ${b.slot?.zone?.level ?? 0}`}
                      </div>
                    </td>

                    <td className="p-2.5 sm:px-3 align-middle">
                      <div className="text-xs">
                        <span className="font-medium text-neutral-800">
                          {new Date(b.expectedExit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="text-[10px] text-neutral-400">
                          {new Date(b.expectedExit).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </td>

                    <td className="p-2.5 sm:px-3 align-middle">
                      <OverstayBadge
                        expectedExit={b.expectedExit}
                        actualExit={b.actualExit}
                        status={b.status}
                      />
                    </td>

                    <td className="p-2.5 sm:px-3 align-middle">
                      <div className="text-xs font-semibold text-neutral-700">
                        ₹{(b.hourlyRatePaise / 100).toFixed(2)}/hr
                      </div>
                      <div className="text-[10px] text-red-600 font-semibold">
                        +1.5x Overtime Tier
                      </div>
                    </td>

                    <td className="p-2.5 sm:px-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/exit?plate=${encodeURIComponent(b.licensePlate)}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-red-700 text-white hover:bg-red-800 transition-colors"
                          title="Process exit & collect overdue penalty"
                        >
                          <DoorClosed size={13} /> Settle Exit
                        </Link>
                        <Link
                          href={`/dashboard/reassign?bookingId=${encodeURIComponent(b.id)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors bg-white"
                          title="Reassign to another bay"
                        >
                          <ArrowRightLeft size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
