"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CircleDollarSign,
  TrendingUp,
  Activity,
  Layers3,
  RefreshCw,
  CheckCircle2,
  Clock,
  CarFront,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { apiGet } from "@/lib/client-api";
import { useAuth } from "@/components/auth-provider";

type RevenueData = {
  totalOccupancy: number;
  occupancyPercent: number;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  shadowSlots: number;
  bookings: {
    ACTIVE?: number;
    COMPLETED?: number;
    PENDING?: number;
    CANCELLED?: number;
  };
  revenuePaise: number;
  liveRevenue: number;
  currency: string;
  updatedAt: string;
};

export default function RevenueDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRevenue = useCallback(async () => {
    setRefreshing(true);
    const res = await apiGet<RevenueData>("/api/finance/revenue");
    if (res.ok) {
      setData(res.data);
      setError("");
    } else {
      setError(res.error);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadRevenue();
    const interval = setInterval(loadRevenue, 30_000);
    return () => clearInterval(interval);
  }, [loadRevenue]);

  if (user && user.role !== "SUPERADMIN") {
    return (
      <div className="text-center py-16 px-6 text-neutral-400 flex flex-col items-center justify-center">
        <ShieldCheck size={36} className="text-red-500 mb-2" />
        <h3 className="text-sm font-semibold text-neutral-800 mt-2 mb-1">Access Restricted</h3>
        <p className="text-xs text-neutral-500">Revenue and settlement analytics are restricted to SuperAdmin accounts.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Revenue & Yield Analytics</h1>
          <p className="text-xs text-neutral-500 mt-1">Financial settlements, dynamic pricing yields, and facility occupancy tracking</p>
        </div>

        <button
          onClick={loadRevenue}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 mb-6 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 px-6 text-neutral-400 flex flex-col items-center justify-center">
          <Loader2 size={24} className="animate-spin text-neutral-400 mb-2" />
          <p className="text-xs text-neutral-500">Compiling revenue metrics…</p>
        </div>
      ) : data ? (
        <>
          {/* Main Financial KPI Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Revenue */}
            <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between border-purple-200 bg-gradient-to-br from-purple-50/50 to-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">Total Realized Revenue</span>
                <CircleDollarSign size={20} className="text-purple-600" />
              </div>
              <div className="text-2xl font-bold tracking-tight mt-2 text-purple-800">
                ₹{data.liveRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs mt-1.5 text-purple-700/80">
                Settled across {data.bookings.COMPLETED ?? 0} departures
              </div>
            </div>

            {/* Occupancy Rate */}
            <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Facility Occupancy</span>
                <Activity size={20} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-bold tracking-tight mt-2 text-emerald-800">
                {data.occupancyPercent}%
              </div>
              <div className="text-xs mt-1.5 text-emerald-700/80">
                {data.occupiedSlots} of {data.totalSlots} general bays currently filled
              </div>
            </div>

            {/* Active Yield */}
            <div className="bg-white border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Active Running Sessions</span>
                <CarFront size={20} className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold tracking-tight mt-2 text-blue-800">
                {data.bookings.ACTIVE ?? 0}
              </div>
              <div className="text-xs mt-1.5 text-blue-700/80">
                Accruing real-time parking hourly meters
              </div>
            </div>
          </div>

          {/* Session Breakdown & Capacity Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Session Volume Breakdown */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Parking Sessions Breakdown</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Total volume across booking lifecycle states</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "Active Parked Sessions",
                    count: data.bookings.ACTIVE ?? 0,
                    color: "bg-emerald-600",
                    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  },
                  {
                    label: "Settled Departures",
                    count: data.bookings.COMPLETED ?? 0,
                    color: "bg-blue-600",
                    badgeStyle: "bg-blue-50 text-blue-700 border-blue-200",
                  },
                  {
                    label: "Upcoming Reservations",
                    count: data.bookings.PENDING ?? 0,
                    color: "bg-amber-500",
                    badgeStyle: "bg-amber-50 text-amber-700 border-amber-200",
                  },
                  {
                    label: "Cancelled Reservations",
                    count: data.bookings.CANCELLED ?? 0,
                    color: "bg-neutral-400",
                    badgeStyle: "bg-neutral-100 text-neutral-600 border-neutral-300",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-3 rounded-lg border border-neutral-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-xs font-semibold text-neutral-800">{item.label}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${item.badgeStyle}`}>
                      {item.count} sessions
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Slot Inventory Breakdown */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Facility Bay Capacity Breakdown</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Physical allocation of facility bays</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Visual bar */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-neutral-700 mb-1.5">
                    <span>Occupied vs Available Distribution</span>
                    <span>{data.occupancyPercent}% load</span>
                  </div>
                  <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-500"
                      style={{ width: `${data.occupancyPercent}%` }}
                      title={`Occupied: ${data.occupiedSlots}`}
                    />
                    <div
                      className="bg-emerald-100 h-full flex-1"
                      title={`Available: ${data.availableSlots}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                    <div className="text-[10px] uppercase font-bold text-neutral-500">General Capacity</div>
                    <div className="text-xl font-bold text-neutral-800 mt-0.5">{data.totalSlots}</div>
                    <div className="text-[11px] text-neutral-500">Standard operational bays</div>
                  </div>

                  <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-200">
                    <div className="text-[10px] uppercase font-bold text-purple-700">Shadow Pool</div>
                    <div className="text-xl font-bold text-purple-900 mt-0.5">{data.shadowSlots}</div>
                    <div className="text-[11px] text-purple-600">Dynamic overflow reserve</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900">
                  <strong>Dynamic Surge Pricing Engine:</strong> Hourly rates automatically scale from
                  ₹50.00/hr (off-peak) up to ₹150.00/hr (peak load) based on live occupancy percentage.
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
