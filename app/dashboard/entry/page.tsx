"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  DoorOpen,
  CarFront,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";

type EntryResponse = {
  booking: {
    id: string;
    status: string;
    licensePlate: string;
    expectedExit: string;
    hourlyRatePaise: number;
    slot: {
      code: string;
      zone?: {
        name: string;
        level: number;
      };
    };
  };
  reassigned: boolean;
  message: string;
};

function EntryForm() {
  const searchParams = useSearchParams();
  const initialPlate = searchParams.get("plate") ?? "";
  const initialReservationId = searchParams.get("reservationId") ?? "";

  const [licensePlate, setLicensePlate] = useState(initialPlate);
  const [vehicleType, setVehicleType] = useState<"FOUR_WHEELER" | "TWO_WHEELER" | "EV" | "SUV">("FOUR_WHEELER");
  const [durationType, setDurationType] = useState<"preset" | "custom">("preset");
  const [durationPreset, setDurationPreset] = useState<number>(120); // 2 hours default
  const [customMinutes, setCustomMinutes] = useState<number>(60);
  const [reservationId, setReservationId] = useState(initialReservationId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EntryResponse | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (initialPlate) setLicensePlate(initialPlate);
    if (initialReservationId) setReservationId(initialReservationId);
  }, [initialPlate, initialReservationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanPlate = licensePlate.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanPlate) {
      setError("Please provide a valid vehicle license plate number");
      setLoading(false);
      return;
    }

    const duration = durationType === "preset" ? durationPreset : customMinutes;

    const payload: Record<string, unknown> = {
      licensePlate: cleanPlate,
      vehicleType,
      durationMinutes: Number(duration),
    };

    if (reservationId.trim()) {
      payload.reservationId = reservationId.trim();
    }

    const res = await apiPost<EntryResponse>("/api/parking/entry", payload);
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setResult(res.data);
    toast(`Vehicle ${cleanPlate} allocated slot ${res.data.booking.slot.code}!`, "success");
  };

  const handleReset = () => {
    setLicensePlate("");
    setReservationId("");
    setResult(null);
    setError("");
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-800 tracking-tight m-0">Gate Arrival & Allocation</h1>
        <p className="text-neutral-500 text-xs sm:text-sm mt-1 mb-0">Record vehicle arrival at entrance gate and dispense parking bay assignment</p>
      </div>

      {result ? (
        /* Entry Ticket Confirmation Card */
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 sm:p-6 mt-4 print:border-none print:shadow-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-200 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={24} className="text-emerald-700" />
              <div>
                <h3 className="!m-0 text-base font-bold text-emerald-800">
                  Entry Recorded & Bay Assigned
                </h3>
                <span className="text-[11px] text-neutral-500">
                  Ticket #{result.booking.id.slice(-8).toUpperCase()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="print:hidden text-xs flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded px-2.5 py-1 bg-white font-medium"
            >
              <Printer size={13} /> Print Ticket
            </button>
          </div>

          {/* Big Bay Callout */}
          <div className="my-4 p-5 rounded-xl bg-white border-2 border-emerald-500 text-center shadow-xs">
            <span className="text-xs uppercase tracking-wider text-neutral-500 font-bold block mb-1">
              PROCEED TO DESIGNATED BAY
            </span>
            <div className="font-mono text-4xl font-extrabold text-emerald-800 tracking-tight">
              {result.booking.slot.code}
            </div>
            <div className="text-sm font-semibold text-neutral-700 mt-1">
              {result.booking.slot.zone?.name ?? "Zone Level"} (Level {result.booking.slot.zone?.level ?? 0})
            </div>
          </div>

          {result.reassigned && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <Sparkles size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Automatic Smart Reassignment:</strong> The original reserved slot was occupied.
                Parkwise automatically allocated an alternate compatible bay of equal priority.
              </div>
            </div>
          )}

          <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-sm mb-6 [&>dt]:text-neutral-500 [&>dt]:font-medium [&>dd]:text-neutral-800 [&>dd]:font-semibold [&>dd]:m-0">
            <dt>License Plate:</dt>
            <dd className="font-mono text-base">{result.booking.licensePlate}</dd>

            <dt>Hourly Rate:</dt>
            <dd>₹{(result.booking.hourlyRatePaise / 100).toFixed(2)}/hour</dd>

            <dt>Expected Exit:</dt>
            <dd>{new Date(result.booking.expectedExit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</dd>

            <dt>Check-in Status:</dt>
            <dd className="text-emerald-700 font-semibold">ACTIVE SESSION</dd>
          </dl>

          <div className="flex justify-end gap-3 print:hidden">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Check In Next Vehicle
            </button>
          </div>
        </div>
      ) : (
        /* Entry Form */
        <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-xs">
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
            {/* License Plate */}
            <div>
              <label htmlFor="license-plate" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                License Plate Number <span className="text-red-500">*</span>
              </label>
              <input
                id="license-plate"
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="e.g. MH12AB1234 or DL8CAF5030"
                required
                autoFocus
                className="w-full text-base font-mono tracking-wider p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Standard state vehicle registration plate. Auto-capitalizes.
              </span>
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Vehicle Classification <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "FOUR_WHEELER", label: "4-Wheeler", icon: CarFront },
                  { id: "TWO_WHEELER", label: "2-Wheeler", icon: Clock },
                  { id: "EV", label: "Electric (EV)", icon: Zap },
                  { id: "SUV", label: "SUV / Large", icon: Sparkles },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = vehicleType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setVehicleType(item.id as "FOUR_WHEELER" | "TWO_WHEELER" | "EV" | "SUV")}
                      className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold"
                          : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      <Icon size={16} className={isSelected ? "text-emerald-700" : "text-neutral-400"} />
                      <span className="text-xs mt-2">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Estimated Parking Duration
              </label>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { mins: 60, label: "1 hour" },
                  { mins: 120, label: "2 hours" },
                  { mins: 240, label: "4 hours" },
                  { mins: 480, label: "8 hours" },
                  { mins: 1440, label: "Full Day" },
                ].map((p) => {
                  const active = durationType === "preset" && durationPreset === p.mins;
                  return (
                    <button
                      key={p.mins}
                      type="button"
                      onClick={() => {
                        setDurationType("preset");
                        setDurationPreset(p.mins);
                      }}
                      className={`py-1.5 px-3 border rounded-md text-xs font-medium cursor-pointer transition-colors ${
                        active
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                          : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDurationType("custom")}
                  className={`py-1.5 px-3 border rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    durationType === "custom"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                      : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  Custom
                </button>
              </div>

              {durationType === "custom" && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min={15}
                    max={10080}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                    className="w-32 text-xs p-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <span className="text-xs text-neutral-500">minutes (15 to 10080)</span>
                </div>
              )}
            </div>

            {/* Optional Reservation ID */}
            <div>
              <label htmlFor="reservation-id" className="block text-xs font-semibold text-neutral-700 mb-1">
                Pre-Booking Confirmation ID (Optional)
              </label>
              <input
                id="reservation-id"
                type="text"
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
                placeholder="Leave blank for on-the-spot gate walk-in"
                className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                If driver reserved beforehand through the member app, entering confirmation ID links the session.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <DoorOpen size={16} />}
                <span>{loading ? "Allocating Bay…" : "Assign Bay & Record Entry"}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-10 px-4 rounded-lg border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors font-medium text-xs cursor-pointer"
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

export default function EntryGatePage() {
  return (
    <Suspense fallback={<div className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-neutral-400 text-sm"><Loader2 size={24} className="animate-spin text-emerald-700" /><p>Loading gate form…</p></div>}>
      <EntryForm />
    </Suspense>
  );
}
