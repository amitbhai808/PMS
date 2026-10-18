"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";
import { Slot } from "@/components/parking/slot-card";

export default function SlotOverridePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotSearch, setSlotSearch] = useState("");
  const [selectedSlotCode, setSelectedSlotCode] = useState("");
  const [newStatus, setNewStatus] = useState<"AVAILABLE" | "OCCUPIED" | "MAINTENANCE">("MAINTENANCE");
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{
    code: string;
    status: string;
    reason: string;
  } | null>(null);

  const { toast } = useToast();

  const loadSlots = async () => {
    setLoadingSlots(true);
    const res = await apiGet<{ slots: Slot[] }>("/api/slots?includeShadow=true");
    if (res.ok) {
      setSlots(res.data.slots);
    }
    setLoadingSlots(false);
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const selectedSlot = slots.find((s) => s.code === selectedSlotCode);

  const filteredSlots = slots.filter((s) =>
    s.code.toLowerCase().includes(slotSearch.toLowerCase().trim())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedSlotCode) {
      setError("Please select a parking bay to override");
      return;
    }

    if (reason.trim().length < 4) {
      setError("Reason must be at least 4 characters long");
      return;
    }

    setSubmitting(true);

    const res = await apiPost<{ slot: Slot }>("/api/operator/override", {
      slotCode: selectedSlotCode,
      status: newStatus,
      reason: reason.trim(),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setSuccessData({
      code: selectedSlotCode,
      status: newStatus,
      reason: reason.trim(),
    });

    toast(`Bay ${selectedSlotCode} successfully overridden to ${newStatus}`, "success");
    await loadSlots();
  };

  const handleReset = () => {
    setSelectedSlotCode("");
    setReason("");
    setSuccessData(null);
    setError("");
  };

  return (
    <div className="max-w-2xl">
      <div className="dash-page-header">
        <h1>Manual Bay Status Override</h1>
        <p>Direct supervisor override to force bay availability, lock for inspection, or clear holds</p>
      </div>

      {successData ? (
        <div className="dash-result-card animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 pb-3 border-b border-emerald-200 mb-4">
            <CheckCircle2 size={22} className="text-emerald-700" />
            <h3 className="!m-0 text-base font-bold text-emerald-800">
              Bay Status Successfully Updated
            </h3>
          </div>

          <dl className="dash-result-detail text-sm mb-5">
            <dt>Bay Identifier:</dt>
            <dd className="font-mono text-base font-bold">{successData.code}</dd>

            <dt>New Status:</dt>
            <dd className="font-bold text-emerald-800 uppercase">{successData.status}</dd>

            <dt>Documented Reason:</dt>
            <dd className="italic">{successData.reason}</dd>

            <dt>Audit Entry:</dt>
            <dd className="text-xs text-neutral-500">Recorded with supervisor signature in facility audit trail</dd>
          </dl>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="dash-form-submit"
            >
              Perform Another Override
            </button>
          </div>
        </div>
      ) : (
        <div className="dash-panel">
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="dash-form">
            {/* Slot Picker */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Target Bay Code <span className="text-red-500">*</span>
              </label>

              {loadingSlots ? (
                <div className="p-3 text-xs text-neutral-500 flex items-center gap-2">
                  <Loader2 size={16} className="spin" /> Loading facility bays…
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Filter bay codes (e.g. B1 or G0)…"
                        value={slotSearch}
                        onChange={(e) => setSlotSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                      <Search size={14} className="absolute left-2.5 top-2 text-neutral-400" />
                    </div>
                  </div>

                  <select
                    value={selectedSlotCode}
                    onChange={(e) => {
                      setSelectedSlotCode(e.target.value);
                      const target = slots.find((s) => s.code === e.target.value);
                      if (target) {
                        setNewStatus(target.status === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE");
                      }
                    }}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="">— Select a parking bay ({filteredSlots.length} matching) —</option>
                    {filteredSlots.map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.code} ({s.status}) • {s.zone?.name ?? `Level ${s.zone?.level ?? 0}`} • {s.slotType}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedSlot && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-center justify-between">
                  <span>
                    Current state: <strong className="uppercase">{selectedSlot.status}</strong>
                  </span>
                  <span>Type: <strong>{selectedSlot.slotType}</strong></span>
                  <span>Allowed: <strong>{selectedSlot.allowedVehicleType}</strong></span>
                </div>
              )}
            </div>

            {/* Target Status */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                New Desired Status <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "AVAILABLE", label: "AVAILABLE", desc: "Open for arrival" },
                  { id: "OCCUPIED", label: "OCCUPIED", desc: "Manual hold" },
                  { id: "MAINTENANCE", label: "MAINTENANCE", desc: "Out of order" },
                ].map((st) => {
                  const isSelected = newStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setNewStatus(st.id as "AVAILABLE" | "OCCUPIED" | "MAINTENANCE")}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold"
                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="text-xs uppercase">{st.label}</div>
                      <div className="text-[10px] text-neutral-500 font-normal mt-0.5">{st.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="override-reason" className="block text-xs font-semibold text-neutral-700 mb-1">
                Mandatory Operational Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                id="override-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Ground maintenance team scheduled line re-painting; barrier gate issue resolved..."
                rows={3}
                required
                minLength={4}
                className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Must be at least 4 characters long. Saved permanently in audit logs.
              </span>
            </div>

            {/* Actions */}
            <div className="dash-form-actions pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedSlotCode}
                className="dash-form-submit flex-1"
              >
                {submitting ? <Loader2 size={16} className="spin" /> : <ShieldAlert size={16} />}
                <span>{submitting ? "Applying Override…" : "Commit Status Override"}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="dash-form-reset"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
