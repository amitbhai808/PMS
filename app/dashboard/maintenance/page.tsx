"use client";

import { useState, useEffect } from "react";
import {
  Wrench,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers3,
  Search,
  Check,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";
import { Slot } from "@/components/parking/slot-card";

export default function MaintenancePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotCode, setSlotCode] = useState("");
  const [reason, setReason] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { toast } = useToast();

  const loadSlots = async () => {
    setLoading(true);
    const res = await apiGet<{ slots: Slot[] }>("/api/slots?includeShadow=true");
    if (res.ok) {
      setSlots(res.data.slots);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const maintenanceSlots = slots.filter((s) => s.status === "MAINTENANCE");
  const availableSlots = slots.filter((s) => s.status === "AVAILABLE");

  const filteredAvailable = availableSlots.filter((s) =>
    s.code.toLowerCase().includes(searchFilter.toLowerCase().trim())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!slotCode) {
      setError("Please select a bay to mark for maintenance");
      return;
    }

    if (reason.trim().length < 4) {
      setError("Please describe the maintenance reason with at least 4 characters");
      return;
    }

    setSubmitting(true);

    const res = await apiPost<{ slot: Slot }>("/api/operator/mark-maintenance", {
      slotCode,
      reason: reason.trim(),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    toast(`Bay ${slotCode} flagged for maintenance`, "success");
    setSlotCode("");
    setReason("");
    await loadSlots();
  };

  const handleQuickRelease = async (code: string) => {
    const res = await apiPost<{ slot: Slot }>("/api/operator/override", {
      slotCode: code,
      status: "AVAILABLE",
      reason: "Maintenance completed; inspected and reopened for parking",
    });

    if (!res.ok) {
      toast(res.error, "error");
      return;
    }

    toast(`Bay ${code} restored to AVAILABLE`, "success");
    await loadSlots();
  };

  return (
    <div className="max-w-4xl">
      <div className="dash-page-header">
        <h1>Bay Maintenance Management</h1>
        <p>Flag bays out-of-order for cleaning or repair, and manage active work orders</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form to Flag for Maintenance */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <div>
              <h3 className="dash-panel-title flex items-center gap-2">
                <Wrench size={16} className="text-amber-600" />
                Schedule Maintenance
              </h3>
              <p className="dash-panel-subtitle">Take an available bay out of service</p>
            </div>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="dash-form">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Target Available Bay <span className="text-red-500">*</span>
              </label>

              <div className="mb-2 relative">
                <input
                  type="text"
                  placeholder="Filter by code…"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <Search size={14} className="absolute left-2.5 top-2 text-neutral-400" />
              </div>

              <select
                value={slotCode}
                onChange={(e) => setSlotCode(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="">— Choose an available bay ({filteredAvailable.length}) —</option>
                {filteredAvailable.map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.code} • {s.zone?.name ?? "Zone"} ({s.slotType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="maint-reason" className="block text-xs font-semibold text-neutral-700 mb-1">
                Reason / Maintenance Work Required <span className="text-red-500">*</span>
              </label>
              <textarea
                id="maint-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Oil spill cleaning, EV charging unit inspection, bay sensor recalibration..."
                rows={3}
                required
                minLength={4}
                className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !slotCode}
              className="dash-form-submit w-full mt-2"
            >
              {submitting ? <Loader2 size={16} className="spin" /> : <Wrench size={16} />}
              <span>{submitting ? "Flagging Bay…" : "Flag Bay For Maintenance"}</span>
            </button>
          </form>
        </div>

        {/* Current Bays in Maintenance Panel */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <div>
              <h3 className="dash-panel-title flex items-center gap-2">
                <Clock size={16} className="text-neutral-500" />
                Active Maintenance Bays ({maintenanceSlots.length})
              </h3>
              <p className="dash-panel-subtitle">Currently blocked from gate allocation</p>
            </div>
          </div>

          {loading ? (
            <div className="dash-empty py-8">
              <Loader2 size={20} className="spin text-neutral-400" />
            </div>
          ) : maintenanceSlots.length === 0 ? (
            <div className="dash-empty py-10">
              <CheckCircle2 size={32} className="text-emerald-600 mb-2" />
              <h3>All Systems Operational</h3>
              <p>Zero bays currently marked under maintenance.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {maintenanceSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-900 px-2 py-0.5 rounded bg-white border border-amber-300">
                        {slot.code}
                      </span>
                      <span className="font-semibold text-neutral-700">
                        {slot.zone?.name ?? `Level ${slot.zone?.level ?? 0}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      {slot.slotType} • {slot.distanceToGate}m to gate
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickRelease(slot.code)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors shadow-2xs"
                    title="Release and mark AVAILABLE"
                  >
                    <Check size={12} className="text-emerald-600" /> Reopen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
