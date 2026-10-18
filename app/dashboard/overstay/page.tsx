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
      <div className="dash-page-header-row mb-6">
        <div className="dash-page-header !mb-0">
          <div className="flex items-center gap-2">
            <h1>Overstay & Violation Watch</h1>
            {overstayBookings.length > 0 && (
              <span className="status-badge overdue !text-xs font-bold px-2 py-0.5">
                {overstayBookings.length} Alert{overstayBookings.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p>Real-time monitor of active parked vehicles that have exceeded their expected exit times</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 flex items-center gap-1">
            <Clock size={13} /> {lastCheck.toLocaleTimeString()}
          </span>
          <button
            onClick={loadOverstays}
            disabled={refreshing}
            className="dash-filter-tab flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "Checking…" : "Check Overstays"}</span>
          </button>
        </div>
      </div>

      {/* Overview Banner */}
      <div className="dash-panel mb-6 !p-4 bg-gradient-to-r from-red-50/60 to-white border-red-200/70">
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
      <div className="dash-panel">
        <div className="dash-panel-header">
          <div>
            <h3 className="dash-panel-title">Vehicles Past Expected Departure</h3>
            <p className="dash-panel-subtitle">Sorted by longest overdue first</p>
          </div>
        </div>

        {loading ? (
          <div className="dash-empty py-12">
            <Loader2 size={24} className="spin text-neutral-400 mb-2" />
            <p>Scanning facility bays for overstays…</p>
          </div>
        ) : overstayBookings.length === 0 ? (
          <div className="dash-empty py-14">
            <CheckCircle2 size={36} className="text-emerald-600 mb-2" />
            <h3>Zero Overstay Violations</h3>
            <p>All vehicles currently parked inside the facility are within their permitted parking windows.</p>
          </div>
        ) : (
          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Vehicle Plate</th>
                  <th>Bay Location</th>
                  <th>Scheduled Departure</th>
                  <th>Overdue Duration</th>
                  <th>Base Rate</th>
                  <th>Gate Actions</th>
                </tr>
              </thead>
              <tbody>
                {overstayBookings.map((b) => (
                  <tr key={b.id} className="overstay-row">
                    <td>
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

                    <td>
                      <span className="font-bold text-xs px-2 py-0.5 rounded bg-white border border-neutral-200">
                        {b.slot?.code ?? "—"}
                      </span>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {b.slot?.zone?.name ?? `Level ${b.slot?.zone?.level ?? 0}`}
                      </div>
                    </td>

                    <td>
                      <div className="text-xs">
                        <span className="font-medium text-neutral-800">
                          {new Date(b.expectedExit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="text-[10px] text-neutral-400">
                          {new Date(b.expectedExit).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </td>

                    <td>
                      <OverstayBadge
                        expectedExit={b.expectedExit}
                        actualExit={b.actualExit}
                        status={b.status}
                      />
                    </td>

                    <td>
                      <div className="text-xs font-semibold text-neutral-700">
                        ₹{(b.hourlyRatePaise / 100).toFixed(2)}/hr
                      </div>
                      <div className="text-[10px] text-red-600 font-semibold">
                        +1.5x Overtime Tier
                      </div>
                    </td>

                    <td>
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
