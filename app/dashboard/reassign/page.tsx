"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CarFront,
  ArrowRight,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";
import { Booking } from "@/components/parking/booking-row";
import { Slot } from "@/components/parking/slot-card";

function ReassignForm() {
  const searchParams = useSearchParams();
  const initialBookingId = searchParams.get("bookingId") ?? "";

  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const [bookingId, setBookingId] = useState(initialBookingId);
  const [targetSlotCode, setTargetSlotCode] = useState("");
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    plate: string;
    oldSlot: string;
    newSlot: string;
  } | null>(null);

  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    const [bookingsRes, slotsRes] = await Promise.all([
      apiGet<{ bookings: Booking[] }>("/api/bookings?status=ACTIVE&take=50"),
      apiGet<{ slots: Slot[] }>("/api/slots?includeShadow=true"),
    ]);

    if (bookingsRes.ok) setActiveBookings(bookingsRes.data.bookings);
    if (slotsRes.ok) {
      setAvailableSlots(slotsRes.data.slots.filter((s) => s.status === "AVAILABLE"));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialBookingId) setBookingId(initialBookingId);
  }, [initialBookingId]);

  const selectedBooking = activeBookings.find((b) => b.id === bookingId);
  const selectedSlot = availableSlots.find((s) => s.code === targetSlotCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!bookingId) {
      setError("Please select an active vehicle booking");
      return;
    }

    if (!targetSlotCode) {
      setError("Please select a target available parking bay");
      return;
    }

    if (reason.trim().length < 4) {
      setError("Please describe the reassignment reason with at least 4 characters");
      return;
    }

    setSubmitting(true);

    const res = await apiPost<{ booking: Booking; unchanged: boolean }>("/api/operator/manual-assign", {
      bookingId,
      slotCode: targetSlotCode,
      reason: reason.trim(),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    const oldSlot = selectedBooking?.slot?.code ?? "Previous Bay";
    setResult({
      plate: selectedBooking?.licensePlate ?? "Vehicle",
      oldSlot,
      newSlot: targetSlotCode,
    });

    toast(`Vehicle ${selectedBooking?.licensePlate} moved from ${oldSlot} to ${targetSlotCode}`, "success");
    await loadData();
  };

  const handleReset = () => {
    setBookingId("");
    setTargetSlotCode("");
    setReason("");
    setResult(null);
    setError("");
  };

  return (
    <div className="max-w-2xl">
      <div className="dash-page-header">
        <h1>Manual Bay Reassignment</h1>
        <p>Transfer an active parked vehicle to a different available parking bay</p>
      </div>

      {result ? (
        <div className="dash-result-card animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 pb-3 border-b border-emerald-200 mb-4">
            <CheckCircle2 size={22} className="text-emerald-700" />
            <h3 className="!m-0 text-base font-bold text-emerald-800">
              Vehicle Reassigned Successfully
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-white border border-emerald-200 flex items-center justify-center gap-4 my-4 shadow-2xs">
            <div className="text-center">
              <span className="text-[10px] text-neutral-400 font-semibold block uppercase">From</span>
              <span className="font-mono text-xl font-bold text-neutral-600 line-through">
                {result.oldSlot}
              </span>
            </div>
            <ArrowRight size={20} className="text-emerald-600" />
            <div className="text-center">
              <span className="text-[10px] text-emerald-600 font-semibold block uppercase">To New Bay</span>
              <span className="font-mono text-2xl font-extrabold text-emerald-800">
                {result.newSlot}
              </span>
            </div>
          </div>

          <dl className="dash-result-detail text-sm mb-5">
            <dt>Vehicle Plate:</dt>
            <dd className="font-mono text-base">{result.plate}</dd>

            <dt>Status:</dt>
            <dd className="text-emerald-700 font-semibold">ACTIVE SESSION (Updated)</dd>

            <dt>Previous Bay:</dt>
            <dd className="text-neutral-500">Released back to AVAILABLE pool</dd>
          </dl>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="dash-form-submit"
            >
              Reassign Another Vehicle
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
            {/* Booking to reassign */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Active Vehicle Session <span className="text-red-500">*</span>
              </label>

              {loading ? (
                <div className="p-3 text-xs text-neutral-500 flex items-center gap-2">
                  <Loader2 size={16} className="spin" /> Loading active sessions…
                </div>
              ) : activeBookings.length === 0 ? (
                <div className="p-3 rounded-lg bg-neutral-50 text-xs text-neutral-500 border border-neutral-200">
                  No active vehicle sessions to reassign.
                </div>
              ) : (
                <select
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="">— Select an active parked vehicle ({activeBookings.length}) —</option>
                  {activeBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.licensePlate} • Current Bay: {b.slot?.code} ({b.slot?.zone?.name ?? "Zone"}) • {b.vehicle?.type ?? "Vehicle"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Target Available Slot */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Target Destination Bay <span className="text-red-500">*</span>
              </label>

              <select
                value={targetSlotCode}
                onChange={(e) => setTargetSlotCode(e.target.value)}
                required
                disabled={availableSlots.length === 0}
                className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="">— Select a vacant target bay ({availableSlots.length} available) —</option>
                {availableSlots.map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.code} • {s.zone?.name ?? `Level ${s.zone?.level ?? 0}`} • {s.slotType} (fits {s.allowedVehicleType})
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reassign-reason" className="block text-xs font-semibold text-neutral-700 mb-1">
                Reason for Bay Reassignment <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reassign-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Driver requested ground floor spot for luggage loading; bay obstruction near B1-002..."
                rows={3}
                required
                minLength={4}
                className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Actions */}
            <div className="dash-form-actions pt-2">
              <button
                type="submit"
                disabled={submitting || !bookingId || !targetSlotCode}
                className="dash-form-submit flex-1"
              >
                {submitting ? <Loader2 size={16} className="spin" /> : <ArrowRightLeft size={16} />}
                <span>{submitting ? "Moving Vehicle…" : "Confirm Bay Reassignment"}</span>
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

export default function ReassignPage() {
  return (
    <Suspense fallback={<div className="dash-loading"><Loader2 size={24} className="spin" /><p>Loading form…</p></div>}>
      <ReassignForm />
    </Suspense>
  );
}
