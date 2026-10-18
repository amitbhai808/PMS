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
      <div className="dash-empty py-16">
        <ShieldCheck size={36} className="text-red-500 mb-2" />
        <h3>Access Restricted</h3>
        <p>Revenue and settlement analytics are restricted to SuperAdmin accounts.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="dash-page-header-row mb-6">
        <div className="dash-page-header !mb-0">
          <h1>Revenue & Yield Analytics</h1>
          <p>Financial settlements, dynamic pricing yields, and facility occupancy tracking</p>
        </div>

        <button
          onClick={loadRevenue}
          disabled={refreshing}
          className="dash-filter-tab flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={refreshing ? "spin" : ""} />
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
        <div className="dash-empty py-16">
          <Loader2 size={24} className="spin text-neutral-400 mb-2" />
          <p>Compiling revenue metrics…</p>
        </div>
      ) : data ? (
        <>
          {/* Main Financial KPI Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Revenue */}
            <div className="dash-stat-card border-purple-200 bg-gradient-to-br from-purple-50/50 to-white">
              <div className="flex items-center justify-between">
                <span className="dash-stat-label">Total Realized Revenue</span>
                <CircleDollarSign size={20} className="text-purple-600" />
              </div>
              <div className="dash-stat-value text-purple-800">
                ₹{data.liveRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="dash-stat-detail text-purple-700/80">
                Settled across {data.bookings.COMPLETED ?? 0} departures
              </div>
            </div>

            {/* Occupancy Rate */}
            <div className="dash-stat-card border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
              <div className="flex items-center justify-between">
                <span className="dash-stat-label">Facility Occupancy</span>
                <Activity size={20} className="text-emerald-600" />
              </div>
              <div className="dash-stat-value text-emerald-800">
                {data.occupancyPercent}%
              </div>
              <div className="dash-stat-detail text-emerald-700/80">
                {data.occupiedSlots} of {data.totalSlots} general bays currently filled
              </div>
            </div>

            {/* Active Yield */}
            <div className="dash-stat-card border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
              <div className="flex items-center justify-between">
                <span className="dash-stat-label">Active Running Sessions</span>
                <CarFront size={20} className="text-blue-600" />
              </div>
              <div className="dash-stat-value text-blue-800">
                {data.bookings.ACTIVE ?? 0}
              </div>
              <div className="dash-stat-detail text-blue-700/80">
                Accruing real-time parking hourly meters
              </div>
            </div>
          </div>

          {/* Session Breakdown & Capacity Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Session Volume Breakdown */}
            <div className="dash-panel">
              <div className="dash-panel-header">
                <div>
                  <h3 className="dash-panel-title">Parking Sessions Breakdown</h3>
                  <p className="dash-panel-subtitle">Total volume across booking lifecycle states</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "Active Parked Sessions",
                    count: data.bookings.ACTIVE ?? 0,
                    color: "bg-emerald-600",
                    badge: "active",
                  },
                  {
                    label: "Settled Departures",
                    count: data.bookings.COMPLETED ?? 0,
                    color: "bg-blue-600",
                    badge: "completed",
                  },
                  {
                    label: "Upcoming Reservations",
                    count: data.bookings.PENDING ?? 0,
                    color: "bg-amber-500",
                    badge: "pending",
                  },
                  {
                    label: "Cancelled Reservations",
                    count: data.bookings.CANCELLED ?? 0,
                    color: "bg-neutral-400",
                    badge: "cancelled",
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
                    <span className={`status-badge ${item.badge} !text-xs`}>
                      {item.count} sessions
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Slot Inventory Breakdown */}
            <div className="dash-panel">
              <div className="dash-panel-header">
                <div>
                  <h3 className="dash-panel-title">Facility Bay Capacity Breakdown</h3>
                  <p className="dash-panel-subtitle">Physical allocation of facility bays</p>
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
