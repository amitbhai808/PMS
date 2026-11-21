"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CarFront,
  Clock3,
  DoorOpen,
  Gauge,
  Loader2,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { apiPost } from "@/lib/client-api";
import TicketSlipPrint from "@/components/parking/ticketSlipPrint";
import { useToast } from "@/components/toast";

type VehicleType = "FOUR_WHEELER" | "TWO_WHEELER" | "EV" | "SUV";

type EntryResponse = {
  booking: {
    id: string;
    status: string;
    licensePlate: string;
    expectedExit: string;
    hourlyRatePaise: number;
    slot: { code: string; zone?: { name: string; level: number } };
  };
  reassigned: boolean;
  message: string;
};

const vehicleTypes: {
  id: VehicleType;
  label: string;
  icon: typeof CarFront;
}[] = [
    { id: "FOUR_WHEELER", label: "4-Wheeler", icon: CarFront },
    { id: "TWO_WHEELER", label: "2-Wheeler", icon: Gauge },
    { id: "EV", label: "Electric (EV)", icon: Zap },
    { id: "SUV", label: "SUV / Large", icon: Sparkles },
  ];

const durationOptions = [
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "4 hours", minutes: 240 },
  { label: "8 hours", minutes: 480 },
  { label: "Full Day", minutes: 1440 },
];

function EntryForm() {
  const searchParams = useSearchParams();
  const initialPlate = searchParams.get("plate") ?? "";
  const initialReservationId = searchParams.get("reservationId") ?? "";
  const { toast } = useToast();

  const [licensePlate, setLicensePlate] = useState(initialPlate);
  const [vehicleType, setVehicleType] = useState<VehicleType>("FOUR_WHEELER");
  const [durationType, setDurationType] = useState<"preset" | "custom">(
    "preset",
  );
  const [durationPreset, setDurationPreset] = useState(120);
  const [customMinutes, setCustomMinutes] = useState(60);
  const [reservationId, setReservationId] = useState(initialReservationId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EntryResponse | null>(null);
  const [issuedAt, setIssuedAt] = useState<Date | null>(null);

  useEffect(() => {
    setLicensePlate(initialPlate);
    setReservationId(initialReservationId);
  }, [initialPlate, initialReservationId]);

  const resetForm = () => {
    setLicensePlate("");
    setReservationId("");
    setVehicleType("FOUR_WHEELER");
    setDurationType("preset");
    setDurationPreset(120);
    setCustomMinutes(60);
    setError("");
    setResult(null);
    setIssuedAt(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanPlate = licensePlate.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanPlate) {
      setError("Please provide a valid vehicle license plate number");
      return;
    }

    setError("");
    setLoading(true);
    const durationMinutes =
      durationType === "preset" ? durationPreset : customMinutes;
    const payload: Record<string, unknown> = {
      licensePlate: cleanPlate,
      vehicleType,
      durationMinutes: Number(durationMinutes),
    };
    if (reservationId.trim()) payload.reservationId = reservationId.trim();

    const response = await apiPost<EntryResponse>(
      "/api/parking/entry",
      payload,
    );
    setLoading(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }

    setResult(response.data);
    setIssuedAt(new Date());
    toast(
      `Vehicle ${cleanPlate} allocated slot ${response.data.booking.slot.code}!`,
      "success",
    );
  };

  if (result) {
    return (
      <div className="max-w-3xl">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#DAF1DE] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#235347]">
            <DoorOpen className="size-3.5" /> Arrival desk
          </div>
          <h1 className="m-0 text-2xl font-bold tracking-[-0.03em] text-[#163B32]">
            Gate arrival & allocation
          </h1>
        </div>
        <div className="space-y-5">
          <TicketSlipPrint
            ticketId={result.booking.id}
            licensePlate={result.booking.licensePlate}
            vehicleType={vehicleType}
            slotCode={result.booking.slot.code}
            zoneName={result.booking.slot.zone?.name}
            level={result.booking.slot.zone?.level}
            hourlyRatePaise={result.booking.hourlyRatePaise}
            expectedExit={result.booking.expectedExit}
            issuedAt={issuedAt ?? new Date()}
          />
          {result.reassigned && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>
                <strong>Automatic smart reassignment:</strong> The reserved bay
                was unavailable, so Parkwise allocated a compatible alternate.
              </span>
            </div>
          )}
          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00845f] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(0,132,95,0.18)] transition hover:bg-[#006d51]"
            >
              <DoorOpen className="size-4" /> Check in next vehicle
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="m-0 text-2xl font-bold tracking-[-0.03em] text-[#163B32]">
          Gate arrival & allocation
        </h1>
        <p className="mt-1 text-sm text-[#658276]">
          Record a vehicle arrival and assign the best available bay.
        </p>
      </div>
      <section className="mb-4 rounded-2xl border border-[#dce9df] bg-white p-5 shadow-[0_10px_30px_rgba(22,59,50,0.05)] md:p-6">
        <div className="mb-6 flex flex-col gap-3 border-b border-[#edf3ee] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#DAF1DE] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#235347]">
              <DoorOpen className="size-3.5" /> Arrival desk
            </div>
            <h2 className="m-0 text-xl font-bold tracking-[-0.03em] text-[#163B32]">
              Ready to assign a bay
            </h2>
            <p className="mt-1 text-xs text-[#658276]">
              Vehicle details are sent securely to the live allocation service.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#658276]">
            <span className="size-2 rounded-full bg-[#8EB69B]" /> Entry lane
            ready
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <label
                htmlFor="license-plate"
                className="mb-2 block text-sm font-bold text-[#163B32]"
              >
                License plate number <span className="text-[#c44935]">*</span>
              </label>
              <input
                id="license-plate"
                type="text"
                value={licensePlate}
                onChange={(event) =>
                  setLicensePlate(event.target.value.toUpperCase())
                }
                placeholder="e.g. MH12AB1234 or DL8CAF5030"
                required
                autoFocus
                className="w-full rounded-xl border border-[#cbdacf] bg-[#fbfdfb] px-4 py-3.5 font-mono text-base text-[#163B32] outline-none transition placeholder:text-[#a1afa7] focus:border-[#008c68] focus:ring-4 focus:ring-[#DAF1DE]"
              />
              <p className="mt-2 text-xs text-[#658276]">
                Standard registration plate. Auto-capitalizes as you type.
              </p>
              <p className="mb-2 mt-5 text-sm font-bold text-[#163B32]">
                Estimated parking duration
              </p>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((option) => (
                  <button
                    key={option.minutes}
                    type="button"
                    onClick={() => {
                      setDurationType("preset");
                      setDurationPreset(option.minutes);
                    }}
                    className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${durationType === "preset" && durationPreset === option.minutes ? "border-[#35d6a5] bg-[#e9fbf4] text-[#006d51]" : "border-[#dce9df] bg-white text-[#658276] hover:border-[#8EB69B]"}`}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDurationType("custom")}
                  className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${durationType === "custom" ? "border-[#35d6a5] bg-[#e9fbf4] text-[#006d51]" : "border-[#dce9df] bg-white text-[#658276] hover:border-[#8EB69B]"}`}
                >
                  Custom
                </button>
              </div>
              {durationType === "custom" && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={15}
                    max={10080}
                    value={customMinutes}
                    onChange={(event) =>
                      setCustomMinutes(Number(event.target.value))
                    }
                    className="w-32 rounded-lg border border-[#cbdacf] bg-[#fbfdfb] px-3 py-2 text-sm text-[#163B32] outline-none focus:border-[#008c68] focus:ring-4 focus:ring-[#DAF1DE]"
                  />
                  <span className="text-xs text-[#658276]">
                    minutes (15 to 10,080)
                  </span>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-[#163B32]">
                Vehicle classification <span className="text-[#c44935]">*</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {vehicleTypes.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVehicleType(id)}
                    className={`flex min-h-[86px] flex-col items-start justify-between rounded-xl border p-3 text-left transition ${vehicleType === id ? "border-[#00a274] bg-[#effcf7] text-[#006d51] shadow-[inset_0_0_0_1px_#00a274]" : "border-[#dce9df] bg-[#fbfdfb] text-[#658276] hover:border-[#8EB69B]"}`}
                  >
                    <Icon className="size-5" />
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-[#edf3ee] pt-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label
                htmlFor="reservation-id"
                className="mb-2 block text-sm font-bold text-[#163B32]"
              >
                Pre-booking confirmation{" "}
                <span className="font-normal text-[#8aa096]">(optional)</span>
              </label>
              <input
                id="reservation-id"
                type="text"
                value={reservationId}
                onChange={(event) => setReservationId(event.target.value)}

                placeholder="Leave blank for a gate walk-in"
                className="w-full rounded-xl border border-[#dce9df] bg-[#fbfdfb] px-4 py-3 text-sm text-[#163B32] outline-none transition placeholder:text-[#a1afa7] focus:border-[#008c68] focus:ring-4 focus:ring-[#DAF1DE]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce9df] px-4 py-3 text-sm font-semibold text-[#658276] transition hover:bg-[#f4f8f5]"
              >
                <RotateCcw className="size-4" /> Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00845f] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(0,132,95,0.18)] transition hover:bg-[#006d51] disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <DoorOpen className="size-4" />
                )}
                {loading ? "Allocating…" : "Assign bay"}
              </button>
            </div>
          </div>
        </form>
      </section>
      <p className="flex items-center gap-2 text-xs text-[#658276]">
        <Clock3 className="size-3.5" /> Entry time is recorded when the
        allocation is confirmed.
      </p>
    </div>
  );
}

export default function EntryGatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-sm text-neutral-400">
          <Loader2 size={24} className="animate-spin text-emerald-700" />
          <p>Loading gate form…</p>
        </div>
      }
    >
      <EntryForm />
    </Suspense>
  );
}
