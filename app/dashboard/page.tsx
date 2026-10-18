"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  CarFront,
  CircleDollarSign,
  Layers3,
  RefreshCw,
  DoorOpen,
  DoorClosed,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { apiGet } from "@/lib/client-api";
import { Booking, BookingRow } from "@/components/parking/booking-row";
import { Slot } from "@/components/parking/slot-card";

type RevenueData = {
  totalOccupancy: number;
  occupancyPercent: number;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  shadowSlots: number;
  bookings: {
    ACTIVE: number;
    COMPLETED: number;
    PENDING: number;
    CANCELLED: number;
  };
  revenuePaise: number;
  liveRevenue: number;
  currency: string;
  updatedAt: string;
};

type ZoneData = {
  id: string;
  name: string;
  level: number;
  isCovered: boolean;
  clearanceHeight?: number | null;
  _count?: { slots: number };
};

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const isSuperAdmin = user?.role === "SUPERADMIN";

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [slotsRes, zonesRes, bookingsRes] = await Promise.all([
        apiGet<{ slots: Slot[] }>("/api/slots?includeShadow=true"),
        apiGet<{ zones: ZoneData[] }>("/api/zones"),
        apiGet<{ bookings: Booking[] }>("/api/bookings?take=10&status=ACTIVE"),
      ]);

      if (slotsRes.ok) setSlots(slotsRes.data.slots);
      if (zonesRes.ok) setZones(zonesRes.data.zones);
      if (bookingsRes.ok) setActiveBookings(bookingsRes.data.bookings);

      if (isSuperAdmin) {
        const revRes = await apiGet<RevenueData>("/api/finance/revenue");
        if (revRes.ok) setRevenueData(revRes.data);
      }

      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Compute metrics from slots if revenue API is not available (for operators)
  const regularSlots = slots.filter((s) => !s.isShadowPool);
  const totalSlotsCount = revenueData?.totalSlots ?? regularSlots.filter((s) => s.status !== "MAINTENANCE").length;
  const occupiedSlotsCount = revenueData?.occupiedSlots ?? regularSlots.filter((s) => s.status === "OCCUPIED").length;
  const availableSlotsCount = revenueData?.availableSlots ?? regularSlots.filter((s) => s.status === "AVAILABLE").length;
  const maintenanceSlotsCount = slots.filter((s) => s.status === "MAINTENANCE").length;
  const shadowSlotsCount = revenueData?.shadowSlots ?? slots.filter((s) => s.isShadowPool).length;
  const occupancyPercent = totalSlotsCount > 0 ? Math.round((occupiedSlotsCount / totalSlotsCount) * 100) : 0;

  // Overstay count among active bookings
  const overdueBookingsCount = activeBookings.filter(
    (b) => new Date(b.expectedExit) < new Date() && !b.actualExit
  ).length;

  return (
    <div>
      {/* Top Welcome & Refresh Row */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-800 tracking-tight m-0">Facility Live Operations</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-1 mb-0">Real-time vehicle presence, gate flow, and parking bay allocation</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 flex items-center gap-1">
            <Clock size={13} /> {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="px-3.5 py-1.5 border border-neutral-300 rounded-md bg-white text-neutral-600 text-xs font-medium cursor-pointer hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
            title="Refresh dashboard stats"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {/* Occupancy Rate */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase">Live Occupancy</span>
            <Activity size={16} className="text-emerald-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-800 tracking-tight mt-1">{occupancyPercent}%</div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {occupiedSlotsCount} of {totalSlotsCount} general slots filled
          </div>
        </div>

        {/* Available Bays */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase">Available Bays</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight mt-1">{availableSlotsCount}</div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Ready for instant gate check-in
          </div>
        </div>

        {/* Active Vehicles On-Site */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase">Parked Vehicles</span>
            <CarFront size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 tracking-tight mt-1">
            {activeBookings.length > 0 ? activeBookings.length : occupiedSlotsCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {overdueBookingsCount > 0 ? (
              <span className="text-red-600 font-semibold flex items-center gap-1">
                <AlertTriangle size={12} /> {overdueBookingsCount} overdue
              </span>
            ) : (
              "All active sessions on schedule"
            )}
          </div>
        </div>

        {/* Revenue or Shadow Pool */}
        {isSuperAdmin && revenueData ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase">Settled Revenue</span>
              <CircleDollarSign size={16} className="text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-700 tracking-tight mt-1">
              ₹{revenueData.liveRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {revenueData.bookings.COMPLETED} completed departures
            </div>
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase">Special Bays</span>
              <Layers3 size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-800 tracking-tight mt-1">
              {shadowSlotsCount} <span className="text-sm font-normal text-neutral-500">shadow</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {maintenanceSlotsCount} bays under maintenance
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Gate Launcher */}
      <div className="bg-white border border-emerald-200/80 rounded-xl p-5 mb-6 shadow-xs bg-gradient-to-r from-emerald-50/50 to-neutral-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-800 m-0">Gate Kiosk Operations</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5 m-0">Immediate actions for gate operators</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/dashboard/entry"
            className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm"
          >
            <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center flex-shrink-0">
              <DoorOpen size={18} />
            </div>
            <div>
              <div className="font-semibold text-sm">Entry Gate</div>
              <div className="text-[11px] text-emerald-100">Check in arriving vehicle</div>
            </div>
          </Link>

          <Link
            href="/dashboard/exit"
            className="flex items-center gap-3 p-3.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center flex-shrink-0">
              <DoorClosed size={18} />
            </div>
            <div>
              <div className="font-semibold text-sm">Exit Gate</div>
              <div className="text-[11px] text-neutral-300">Bill & record departure</div>
            </div>
          </Link>

          <Link
            href="/dashboard/slots"
            className="flex items-center gap-3 p-3.5 rounded-lg bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <div className="w-9 h-9 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0 text-emerald-700">
              <Layers3 size={18} />
            </div>
            <div>
              <div className="font-semibold text-sm">Parking Layout</div>
              <div className="text-[11px] text-neutral-500">View real-time bay map</div>
            </div>
          </Link>

          <Link
            href="/dashboard/override"
            className="flex items-center gap-3 p-3.5 rounded-lg bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <div className="w-9 h-9 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0 text-amber-600">
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="font-semibold text-sm">Slot Override</div>
              <div className="text-[11px] text-neutral-500">Lock or free bays</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Zone Capacity Cards */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-800 m-0">Levels & Zones Distribution</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5 m-0">Available bays across facility floors</p>
          </div>
          <Link
            href="/dashboard/slots"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            View Full Grid <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {zones.map((zone) => {
            const zoneSlots = slots.filter((s) => s.zoneId === zone.id && !s.isShadowPool);
            const zoneAvailable = zoneSlots.filter((s) => s.status === "AVAILABLE").length;
            const zoneOccupied = zoneSlots.filter((s) => s.status === "OCCUPIED").length;
            const zoneTotal = zoneSlots.length;
            const pct = zoneTotal > 0 ? Math.round((zoneOccupied / zoneTotal) * 100) : 0;

            return (
              <div
                key={zone.id}
                className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-neutral-800">{zone.name}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700">
                      Level {zone.level}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 mb-3">
                    {zone.isCovered ? "Covered Bay" : "Open Rooftop"}
                    {zone.clearanceHeight ? ` • ${zone.clearanceHeight}m max` : ""}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-emerald-700 font-medium">
                      <strong className="font-bold">{zoneAvailable}</strong> free
                    </span>
                    <span className="text-neutral-500">{pct}% filled</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        pct > 85 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-600"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Currently Parked Vehicles Table */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-800 m-0">Active Parked Vehicles</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5 m-0">Vehicles currently occupying facility slots</p>
          </div>
          <Link
            href="/dashboard/bookings"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            All Bookings <ArrowRight size={13} />
          </Link>
        </div>

        {activeBookings.length === 0 ? (
          <div className="text-center py-10 px-6 text-neutral-400">
            <CarFront size={32} className="mx-auto mb-3 text-neutral-300" />
            <h3 className="m-0 mb-1.5 text-neutral-600 text-[15px] font-semibold">No Active Vehicles</h3>
            <p className="m-0 text-[13px] text-neutral-500">All parking bays are currently unoccupied. New check-ins will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Vehicle Plate</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Assigned Slot</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Entry Time</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Expected Exit</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Rate</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Status</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeBookings.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
