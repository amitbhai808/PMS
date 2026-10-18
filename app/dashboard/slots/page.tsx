"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Slot } from "@/components/parking/slot-card";
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
      <div className="dash-page-header-row mb-6">
        <div className="dash-page-header !mb-0">
          <h1>Parking Bays Layout</h1>
          <p>Live visual map of all bays across facility zones</p>
        </div>

        <button
          onClick={loadSlotsAndZones}
          disabled={refreshing}
          className="dash-filter-tab flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={refreshing ? "spin" : ""} />
          <span>{refreshing ? "Refreshing…" : "Refresh Bays"}</span>
        </button>
      </div>

      {/* Control Bar: Zone tabs, search, status filter */}
      <div className="dash-panel mb-6 !p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Zone Selector Tabs */}
          <div className="dash-filter-tabs !mb-0">
            <button
              onClick={() => setSelectedZoneId("ALL")}
              className={`dash-filter-tab ${selectedZoneId === "ALL" ? "active" : ""}`}
            >
              All Zones ({slots.length})
            </button>
            {zones.map((zone) => {
              const count = slots.filter((s) => s.zoneId === zone.id).length;
              return (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`dash-filter-tab ${selectedZoneId === zone.id ? "active" : ""}`}
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
          {["ALL", "AVAILABLE", "OCCUPIED", "MAINTENANCE"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`dash-filter-tab !py-1 !px-2.5 !text-xs ${
                selectedStatus === st ? "active" : ""
              }`}
            >
              {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid rendering grouped by zone if 'ALL' is selected, or single grid */}
      {loading ? (
        <div className="dash-empty py-16">
          <Loader2 size={24} className="spin text-neutral-400 mb-2" />
          <p>Loading parking bays layout…</p>
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

            {overrideError && (
              <div className="login-error !mb-4">{overrideError}</div>
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
                  className="dash-form-reset !h-8 !text-xs !px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideLoading}
                  className="dash-form-submit !h-8 !text-xs !px-4"
                >
                  {overrideLoading ? <Loader2 size={13} className="spin" /> : <ShieldAlert size={13} />}
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
