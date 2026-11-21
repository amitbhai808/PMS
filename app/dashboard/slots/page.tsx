"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  X,
  Loader2,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";
import { Slot, getSlotVehicle } from "@/components/parking/slot-card";
import { SlotGrid } from "@/components/parking/slot-grid";

type Zone = {
  id: string;
  name: string;
  level: number;
};

export default function ParkingLayoutPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [showShadowPool, setShowShadowPool] = useState(true);

  // Selected slot for quick override modal
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<"AVAILABLE" | "OCCUPIED" | "MAINTENANCE">("MAINTENANCE");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState("");

  const { toast } = useToast();

  const loadSlotsAndZones = async () => {
    setRefreshing(true);
    try {
      const [slotsRes, zonesRes] = await Promise.all([
        apiGet<{ slots: Slot[] }>("/api/slots?includeShadow=true"),
        apiGet<{ zones: Zone[] }>("/api/zones"),
      ]);

      if (slotsRes.ok) setSlots(slotsRes.data.slots);
      if (zonesRes.ok) setZones(zonesRes.data.zones);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSlotsAndZones();
  }, []);

  // Filter slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      // Zone filter
      if (selectedZoneId !== "ALL" && slot.zoneId !== selectedZoneId) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "ALL" && slot.status !== selectedStatus) {
        return false;
      }
      // Shadow pool toggle
      if (!showShadowPool && slot.isShadowPool) {
        return false;
      }
      // Search query (code or zone name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const codeMatch = slot.code.toLowerCase().includes(query);
        const zoneMatch = slot.zone?.name.toLowerCase().includes(query) ?? false;
        if (!codeMatch && !zoneMatch) return false;
      }
      return true;
    });
  }, [slots, selectedZoneId, selectedStatus, showShadowPool, searchQuery]);

  const handleSlotClick = (slot: Slot) => {
    setSelectedSlot(slot);
    setOverrideStatus(slot.status);
    setOverrideReason("");
    setOverrideError("");
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    if (overrideReason.trim().length < 4) {
      setOverrideError("Please provide a reason with at least 4 characters");
      return;
    }

    setOverrideLoading(true);
    setOverrideError("");

    const result = await apiPost<{ slot: Slot }>("/api/operator/override", {
      slotCode: selectedSlot.code,
      status: overrideStatus,
      reason: overrideReason.trim(),
    });

    setOverrideLoading(false);

    if (!result.ok) {
      setOverrideError(result.error);
      return;
    }

    toast(`Slot ${selectedSlot.code} status updated to ${overrideStatus}`, "success");
    setSelectedSlot(null);
    await loadSlotsAndZones();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-800 tracking-tight m-0">Parking Bays Layout</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-1 mb-0">Live visual map of all bays across facility zones</p>
        </div>

        <button
          onClick={loadSlotsAndZones}
          disabled={refreshing}
          className="px-3.5 py-1.5 border border-neutral-300 rounded-md bg-white text-neutral-600 text-xs font-medium cursor-pointer hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          <span>{refreshing ? "Refreshing…" : "Refresh Bays"}</span>
        </button>
      </div>

      {/* Control Bar: Zone tabs, search, status filter */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Zone Selector Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedZoneId("ALL")}
              className={`px-3 py-1.5 border rounded-md text-xs font-medium cursor-pointer transition-colors ${selectedZoneId === "ALL"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                  : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
            >
              All Zones ({slots.length})
            </button>
            {zones.map((zone) => {
              const count = slots.filter((s) => s.zoneId === zone.id).length;
              const active = selectedZoneId === zone.id;
              return (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`px-3 py-1.5 border rounded-md text-xs font-medium cursor-pointer transition-colors ${active
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                      : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                >
                  {zone.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Search box & Shadow Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search code (e.g. B1-001)…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-neutral-300 w-52 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <Search size={14} className="absolute left-2.5 top-2 text-neutral-400" />
            </div>

            <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showShadowPool}
                onChange={(e) => setShowShadowPool(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              Shadow bays
            </label>
          </div>
        </div>

        {/* Status Filter Row */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100 flex-wrap">
          <span className="text-xs text-neutral-400 flex items-center gap-1 mr-1">
            <Filter size={12} /> Status:
          </span>
          {["ALL", "AVAILABLE", "OCCUPIED", "MAINTENANCE"].map((st) => {
            const active = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`py-1 px-2.5 text-xs border rounded-md font-medium cursor-pointer transition-colors ${active
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                    : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
              >
                {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>

        {/* Vehicle Classification Visual Guide */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-100 flex-wrap text-xs text-neutral-500">
          <span className="font-semibold text-neutral-700 text-[11px] uppercase tracking-wider">Parked Vehicle Visuals:</span>
          <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-md border border-neutral-200">
            <Image src="/vehicles/car.png" alt="Sedan" width={20} height={40} className="h-5 w-auto object-contain" unoptimized />
            <span className="text-[11px] font-medium text-neutral-700">Sedan / 4-Wheeler</span>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-md border border-neutral-200">
            <Image src="/vehicles/two-wheeler.png" alt="2-Wheeler" width={20} height={40} className="h-5 w-auto object-contain" unoptimized />
            <span className="text-[11px] font-medium text-neutral-700">2-Wheeler</span>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-md border border-neutral-200">
            <Image src="/vehicles/ev.png" alt="EV" width={20} height={40} className="h-5 w-auto object-contain" unoptimized />
            <span className="text-[11px] font-medium text-neutral-700">Electric (EV)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-md border border-neutral-200">
            <Image src="/vehicles/suv.png" alt="SUV" width={20} height={40} className="h-5 w-auto object-contain" unoptimized />
            <span className="text-[11px] font-medium text-neutral-700">SUV / Large</span>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-md border border-neutral-200">
            <Image src="/vehicles/sports.png" alt="VIP" width={20} height={40} className="h-5 w-auto object-contain" unoptimized />
            <span className="text-[11px] font-medium text-neutral-700">Sports / VIP</span>
          </div>
        </div>
      </div>

      {/* Grid rendering grouped by zone if 'ALL' is selected, or single grid */}
      {loading ? (
        <div className="text-center py-16 px-6 text-neutral-400">
          <Loader2 size={24} className="animate-spin text-neutral-400 mb-2 mx-auto" />
          <p className="text-xs">Loading parking bays layout…</p>
        </div>
      ) : selectedZoneId === "ALL" ? (
        zones.map((zone) => {
          const zoneSlots = filteredSlots.filter((s) => s.zoneId === zone.id);
          if (zoneSlots.length === 0) return null;
          return (
            <SlotGrid
              key={zone.id}
              zoneName={`${zone.name} (Level ${zone.level})`}
              slots={zoneSlots}
              onSelectSlot={handleSlotClick}
              selectedSlotId={selectedSlot?.id}
            />
          );
        })
      ) : (
        <SlotGrid
          zoneName={zones.find((z) => z.id === selectedZoneId)?.name}
          slots={filteredSlots}
          onSelectSlot={handleSlotClick}
          selectedSlotId={selectedSlot?.id}
        />
      )}

      {/* Quick Slot Action Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {selectedSlot.code}
                </span>
                <span className="text-xs text-neutral-500 font-medium">
                  {selectedSlot.zone?.name ?? "Zone"} • Level {selectedSlot.zone?.level ?? 0}
                </span>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-neutral-600 space-y-1.5 mb-5 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <div className="flex justify-between">
                <span>Current Status:</span>
                <span className="font-bold uppercase text-neutral-900">{selectedSlot.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Bay Category:</span>
                <span className="font-semibold text-neutral-900">{selectedSlot.slotType}</span>
              </div>
              <div className="flex justify-between">
                <span>Allowed Vehicle:</span>
                <span className="font-semibold text-neutral-900">{selectedSlot.allowedVehicleType}</span>
              </div>
              <div className="flex justify-between">
                <span>Distance to Entrance:</span>
                <span className="font-semibold text-neutral-900">{selectedSlot.distanceToGate} meters</span>
              </div>
            </div>

            {selectedSlot.status === "OCCUPIED" && (
              <div className="mb-4 p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center gap-3.5">
                <div className="w-16 h-16 bg-white rounded-lg border border-rose-100 flex items-center justify-center p-1 shadow-2xs shrink-0">
                  <Image
                    src={getSlotVehicle(selectedSlot).src}
                    alt={getSlotVehicle(selectedSlot).alt}
                    width={40}
                    height={80}
                    className="h-14 w-auto object-contain drop-shadow"
                    unoptimized
                  />
                </div>
                <div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded mb-0.5">
                    Currently Parked
                  </span>
                  <div className="text-xs font-bold text-neutral-900">
                    {getSlotVehicle(selectedSlot).name} Detected
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Physical bay occupancy registered at gate or sensor.
                  </div>
                </div>
              </div>
            )}

            {overrideError && (
              <div className="p-3 px-3.5 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-medium">{overrideError}</div>
            )}

            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Change Bay Status
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as "AVAILABLE" | "OCCUPIED" | "MAINTENANCE")}
                  className="w-full text-xs p-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                >
                  <option value="AVAILABLE">AVAILABLE (Open for parking)</option>
                  <option value="OCCUPIED">OCCUPIED (Manual hold / vehicle parked)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Block bay for repair)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Reason for Override <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Bay cleaning, reserved for inspection, vehicle parked manually..."
                  rows={2}
                  required
                  minLength={4}
                  className="w-full text-xs p-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="h-8 text-xs px-3 rounded-lg border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideLoading}
                  className="h-8 text-xs px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {overrideLoading ? <Loader2 size={13} className="animate-spin" /> : <ShieldAlert size={13} />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
