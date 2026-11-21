"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Search, ShieldAlert } from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";
import type { Slot } from "@/components/parking/slot-card";
import { FormError, OperatorCard, OperatorPageHeader } from "@/components/admin_dashboards/operator-ui";

type SlotStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
const statusOptions: { id: SlotStatus; label: string; description: string; tone: string }[] = [
  { id: "AVAILABLE", label: "Available", description: "Open this bay for arrivals", tone: "border-status-success/30 bg-status-success-soft text-status-success" },
  { id: "OCCUPIED", label: "Occupied", description: "Create a controlled manual hold", tone: "border-status-info/30 bg-status-info-soft text-status-info" },
  { id: "MAINTENANCE", label: "Maintenance", description: "Keep the bay out of allocation", tone: "border-status-warning/30 bg-status-warning-soft text-status-warning" },
];

export default function SlotOverridePage() {
  const { toast } = useToast();
  const [slots, setSlots] = useState<Slot[]>([]); const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotSearch, setSlotSearch] = useState(""); const [selectedSlotCode, setSelectedSlotCode] = useState("");
  const [newStatus, setNewStatus] = useState<SlotStatus>("MAINTENANCE"); const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ code: string; status: SlotStatus; reason: string } | null>(null);

  const loadSlots = async () => { setLoadingSlots(true); const response = await apiGet<{ slots: Slot[] }>("/api/slots?includeShadow=true"); if (response.ok) setSlots(response.data.slots); setLoadingSlots(false); };
  useEffect(() => { void loadSlots(); }, []);
  const selectedSlot = slots.find((slot) => slot.code === selectedSlotCode);
  const filteredSlots = slots.filter((slot) => slot.code.toLowerCase().includes(slotSearch.toLowerCase().trim()));
  const reset = () => { setSelectedSlotCode(""); setReason(""); setError(""); setSuccess(null); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSlotCode) { setError("Select a parking bay to override."); return; }
    if (reason.trim().length < 4) { setError("Provide an operational reason with at least 4 characters."); return; }
    setError(""); setSubmitting(true);
    const response = await apiPost<{ slot: Slot }>("/api/operator/override", { slotCode: selectedSlotCode, status: newStatus, reason: reason.trim() });
    setSubmitting(false); if (!response.ok) { setError(response.error); return; }
    setSuccess({ code: selectedSlotCode, status: newStatus, reason: reason.trim() }); toast(`Bay ${selectedSlotCode} updated to ${newStatus}`, "success"); await loadSlots();
  };

  return <div className="max-w-4xl">
    <OperatorPageHeader eyebrow="Supervisor control" title="Override bay status" description="Apply an audited operational status change when the live bay state needs intervention." icon={ShieldAlert} />
    {success ? <OperatorCard className="border-status-success/30 bg-status-success-soft"><div className="flex gap-3 border-b border-status-success/20 pb-4"><CheckCircle2 className="size-6 text-status-success" /><div><h2 className="m-0 text-lg font-bold text-ops-ink">Override recorded</h2><p className="mt-1 text-sm text-ops-muted">The new bay state is live and recorded in the audit trail.</p></div></div><dl className="my-6 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[150px_1fr] [&>dt]:font-medium [&>dt]:text-ops-muted [&>dd]:m-0 [&>dd]:font-semibold [&>dd]:text-ops-ink"><dt>Bay identifier</dt><dd className="font-mono text-base">{success.code}</dd><dt>New status</dt><dd className="uppercase text-status-success">{success.status}</dd><dt>Reason</dt><dd>{success.reason}</dd><dt>Audit status</dt><dd>Supervisor override recorded</dd></dl><div className="flex justify-end"><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-ops-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-ops-primary-hover"><ShieldAlert className="size-4" /> Perform another override</button></div></OperatorCard> : <OperatorCard>
      {error && <FormError>{error}</FormError>}
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]"><div><label htmlFor="target-bay" className="mb-2 block text-sm font-bold text-ops-ink">Target bay <span className="text-status-danger">*</span></label>{loadingSlots ? <div className="flex items-center gap-2 rounded-xl bg-ops-canvas p-4 text-sm text-ops-muted"><Loader2 className="size-4 animate-spin" /> Loading facility bays…</div> : <><div className="relative mb-2"><Search className="absolute left-3 top-3 size-4 text-ops-muted" /><input value={slotSearch} onChange={(event) => setSlotSearch(event.target.value)} placeholder="Search bay code" className="w-full rounded-xl border border-ops-border bg-[#fbfdfb] py-3 pr-4 pl-10 text-sm text-ops-ink outline-none transition placeholder:text-[#a1afa7] focus:border-ops-primary focus:ring-4 focus:ring-pine-50" /></div><select id="target-bay" value={selectedSlotCode} onChange={(event) => { setSelectedSlotCode(event.target.value); const slot = slots.find((item) => item.code === event.target.value); if (slot) setNewStatus(slot.status === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE"); }} className="w-full rounded-xl border border-ops-border bg-white px-4 py-3 text-sm text-ops-ink outline-none transition focus:border-ops-primary focus:ring-4 focus:ring-pine-50"><option value="">Select a bay ({filteredSlots.length} matches)</option>{filteredSlots.map((slot) => <option key={slot.id} value={slot.code}>{slot.code} · {slot.status} · {slot.zone?.name ?? "Zone"}</option>)}</select></>}{selectedSlot && <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-ops-border bg-ops-canvas p-3 text-xs text-ops-muted"><span>Status <strong className="block text-ops-ink">{selectedSlot.status}</strong></span><span>Type <strong className="block text-ops-ink">{selectedSlot.slotType}</strong></span><span>Allowed <strong className="block text-ops-ink">{selectedSlot.allowedVehicleType}</strong></span></div>}</div>
          <div><p className="mb-2 text-sm font-bold text-ops-ink">New status <span className="text-status-danger">*</span></p><div className="grid gap-2">{statusOptions.map((option) => <button key={option.id} type="button" onClick={() => setNewStatus(option.id)} className={`rounded-xl border p-3 text-left transition ${newStatus === option.id ? option.tone + " shadow-[inset_0_0_0_1px_currentColor]" : "border-ops-border bg-[#fbfdfb] text-ops-muted hover:border-pine-300"}`}><strong className="block text-sm">{option.label}</strong><span className="mt-0.5 block text-xs opacity-80">{option.description}</span></button>)}</div></div></div>
        <div><label htmlFor="override-reason" className="mb-2 block text-sm font-bold text-ops-ink">Operational justification <span className="text-status-danger">*</span></label><textarea id="override-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} minLength={4} required placeholder="Explain why this status change is required. This is stored in the audit log." className="w-full rounded-xl border border-ops-border bg-[#fbfdfb] px-4 py-3 text-sm text-ops-ink outline-none transition placeholder:text-[#a1afa7] focus:border-ops-primary focus:ring-4 focus:ring-pine-50" /></div>
        <div className="flex justify-end gap-2 border-t border-ops-border pt-5"><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-ops-border px-4 py-3 text-sm font-semibold text-ops-muted transition hover:bg-ops-canvas"><RotateCcw className="size-4" /> Reset</button><button type="submit" disabled={submitting || !selectedSlotCode} className="inline-flex items-center gap-2 rounded-xl bg-ops-primary px-5 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(0,132,95,0.18)] transition hover:bg-ops-primary-hover disabled:cursor-wait disabled:opacity-70">{submitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />}{submitting ? "Applying override…" : "Commit override"}</button></div>
      </form>
    </OperatorCard>}
  </div>;
}
