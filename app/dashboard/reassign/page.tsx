"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ArrowRightLeft, CarFront, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";
import type { Booking } from "@/components/parking/booking-row";
import type { Slot } from "@/components/parking/slot-card";
import { FormError, OperatorCard, OperatorPageHeader } from "@/components/admin_dashboards/operator-ui";

function ReassignForm() {
  const searchParams = useSearchParams();
  const initialBookingId = searchParams.get("bookingId") ?? "";
  const { toast } = useToast();
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState(initialBookingId);
  const [targetSlotCode, setTargetSlotCode] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ plate: string; oldSlot: string; newSlot: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [bookingsResult, slotsResult] = await Promise.all([
      apiGet<{ bookings: Booking[] }>("/api/bookings?status=ACTIVE&take=50"),
      apiGet<{ slots: Slot[] }>("/api/slots?includeShadow=true"),
    ]);
    if (bookingsResult.ok) setActiveBookings(bookingsResult.data.bookings);
    if (slotsResult.ok) setAvailableSlots(slotsResult.data.slots.filter((slot) => slot.status === "AVAILABLE"));
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, []);
  useEffect(() => { if (initialBookingId) setBookingId(initialBookingId); }, [initialBookingId]);

  const selectedBooking = activeBookings.find((booking) => booking.id === bookingId);
  const selectedSlot = availableSlots.find((slot) => slot.code === targetSlotCode);
  const reset = () => { setBookingId(""); setTargetSlotCode(""); setReason(""); setResult(null); setError(""); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bookingId || !targetSlotCode) { setError("Select both an active vehicle session and a vacant destination bay."); return; }
    if (reason.trim().length < 4) { setError("Provide a reassignment reason with at least 4 characters."); return; }
    setError(""); setSubmitting(true);
    const response = await apiPost<{ booking: Booking; unchanged: boolean }>("/api/operator/manual-assign", { bookingId, slotCode: targetSlotCode, reason: reason.trim() });
    setSubmitting(false);
    if (!response.ok) { setError(response.error); return; }
    const oldSlot = selectedBooking?.slot?.code ?? "Previous bay";
    setResult({ plate: selectedBooking?.licensePlate ?? "Vehicle", oldSlot, newSlot: targetSlotCode });
    toast(`Vehicle ${selectedBooking?.licensePlate} moved from ${oldSlot} to ${targetSlotCode}`, "success");
    await loadData();
  };

  return <div className="max-w-4xl">
    <OperatorPageHeader eyebrow="Operator action" title="Reassign an active vehicle" description="Move a currently parked vehicle to a safe, available replacement bay." icon={ArrowRightLeft} />
    {result ? <OperatorCard className="border-status-success/30 bg-status-success-soft">
      <div className="flex items-start gap-3 border-b border-status-success/20 pb-4"><CheckCircle2 className="mt-0.5 size-6 text-status-success" /><div><h2 className="m-0 text-lg font-bold text-ops-ink">Vehicle reassigned</h2><p className="mt-1 text-sm text-ops-muted">The live session and bay availability have been updated.</p></div></div>
      <div className="my-6 grid items-center gap-3 rounded-xl border border-status-success/20 bg-white p-5 text-center sm:grid-cols-[1fr_auto_1fr]">
        <div><span className="block text-[10px] font-bold uppercase tracking-wider text-ops-muted">Previous bay</span><strong className="font-mono text-2xl text-ops-muted line-through">{result.oldSlot}</strong></div>
        <ArrowRight className="mx-auto size-6 text-status-success" />
        <div><span className="block text-[10px] font-bold uppercase tracking-wider text-status-success">New assigned bay</span><strong className="font-mono text-3xl text-ops-ink">{result.newSlot}</strong></div>
      </div>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[140px_1fr] [&>dt]:font-medium [&>dt]:text-ops-muted [&>dd]:m-0 [&>dd]:font-semibold [&>dd]:text-ops-ink"><dt>Vehicle plate</dt><dd className="font-mono">{result.plate}</dd><dt>Session status</dt><dd className="text-status-success">ACTIVE · UPDATED</dd><dt>Previous bay</dt><dd>Returned to the available pool</dd></dl>
      <div className="mt-6 flex justify-end"><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-ops-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-ops-primary-hover"><ArrowRightLeft className="size-4" /> Reassign another vehicle</button></div>
    </OperatorCard> : <OperatorCard>
      {error && <FormError>{error}</FormError>}
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div><label htmlFor="active-booking" className="mb-2 block text-sm font-bold text-ops-ink">Active vehicle session <span className="text-status-danger">*</span></label>
            {loading ? <div className="flex items-center gap-2 rounded-xl bg-ops-canvas p-4 text-sm text-ops-muted"><Loader2 className="size-4 animate-spin" /> Loading active sessions…</div> : activeBookings.length === 0 ? <div className="rounded-xl border border-ops-border bg-ops-canvas p-4 text-sm text-ops-muted">No active vehicle sessions need reassignment.</div> : <select id="active-booking" value={bookingId} onChange={(event) => setBookingId(event.target.value)} className="w-full rounded-xl border border-ops-border bg-ops-surface px-4 py-3 text-sm text-ops-ink outline-none transition focus:border-ops-primary focus:ring-4 focus:ring-pine-50"><option value="">Select a parked vehicle ({activeBookings.length})</option>{activeBookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.licensePlate} · {booking.slot?.code} · {booking.slot?.zone?.name ?? "Zone"}</option>)}</select>}
          </div>
          {selectedBooking && <div className="rounded-xl border border-status-info/20 bg-status-info-soft p-4 text-sm"><span className="text-status-info">Currently parked</span><div className="mt-1 flex items-center gap-2 font-semibold text-ops-ink"><CarFront className="size-4" /> {selectedBooking.licensePlate} · {selectedBooking.slot?.code}</div></div>}
        </div>
        <div className="space-y-5">
          <div><label htmlFor="destination-bay" className="mb-2 block text-sm font-bold text-ops-ink">Destination bay <span className="text-status-danger">*</span></label><select id="destination-bay" value={targetSlotCode} onChange={(event) => setTargetSlotCode(event.target.value)} disabled={!availableSlots.length} className="w-full rounded-xl border border-ops-border bg-ops-surface px-4 py-3 text-sm text-ops-ink outline-none transition focus:border-ops-primary focus:ring-4 focus:ring-pine-50 disabled:cursor-not-allowed disabled:bg-ops-canvas"><option value="">Select a vacant bay ({availableSlots.length})</option>{availableSlots.map((slot) => <option key={slot.id} value={slot.code}>{slot.code} · {slot.zone?.name ?? `Level ${slot.zone?.level ?? 0}`} · {slot.slotType}</option>)}</select></div>
          {selectedSlot && <div className="rounded-xl border border-status-success/20 bg-status-success-soft p-4 text-sm"><span className="text-status-success">Destination details</span><div className="mt-1 font-semibold text-ops-ink">{selectedSlot.code} · {selectedSlot.slotType} · fits {selectedSlot.allowedVehicleType}</div></div>}
        </div>
        <div className="lg:col-span-2"><label htmlFor="reassign-reason" className="mb-2 block text-sm font-bold text-ops-ink">Reason for reassignment <span className="text-status-danger">*</span></label><textarea id="reassign-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} minLength={4} required placeholder="Describe why the vehicle needs to move; this is saved in the audit log." className="w-full rounded-xl border border-ops-border bg-[#fbfdfb] px-4 py-3 text-sm text-ops-ink outline-none transition placeholder:text-[#a1afa7] focus:border-ops-primary focus:ring-4 focus:ring-pine-50" /></div>
        <div className="flex justify-end gap-2 border-t border-ops-border pt-5 lg:col-span-2"><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-ops-border px-4 py-3 text-sm font-semibold text-ops-muted transition hover:bg-ops-canvas"><RotateCcw className="size-4" /> Reset</button><button type="submit" disabled={submitting || !bookingId || !targetSlotCode} className="inline-flex items-center gap-2 rounded-xl bg-ops-primary px-5 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(0,132,95,0.18)] transition hover:bg-ops-primary-hover disabled:cursor-wait disabled:opacity-70">{submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}{submitting ? "Moving vehicle…" : "Confirm reassignment"}</button></div>
      </form>
    </OperatorCard>}
  </div>;
}

export default function ReassignPage() { return <Suspense fallback={<div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-sm text-ops-muted"><Loader2 className="size-6 animate-spin text-ops-primary" /><p>Loading reassignment…</p></div>}><ReassignForm /></Suspense>; }
