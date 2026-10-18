"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  CarFront,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";

type Vehicle = {
  licensePlate: string;
  type: "FOUR_WHEELER" | "TWO_WHEELER" | "EV" | "SUV";
};

type ReserveResponse = {
  booking: {
    id: string;
    licensePlate: string;
    status: string;
    expectedEntry: string;
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
};

function ReserveForm() {
  const searchParams = useSearchParams();
  const initialPlate = searchParams.get("plate") ?? "";

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [selectedPlate, setSelectedPlate] = useState(initialPlate);
  const [entryDate, setEntryDate] = useState("");
  const [exitDate, setExitDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReserveResponse["booking"] | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Default entry to +1 hour, exit to +3 hours from now
    const now = new Date();
    const futureEntry = new Date(now.getTime() + 60 * 60_000);
    const futureExit = new Date(now.getTime() + 180 * 60_000);

    // Format for datetime-local (YYYY-MM-DDTHH:mm)
    const formatLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEntryDate(formatLocal(futureEntry));
    setExitDate(formatLocal(futureExit));

    const loadVehicles = async () => {
      setLoadingVehicles(true);
      const res = await apiGet<{ vehicles: Vehicle[] }>("/api/member/register-vehicle");
      if (res.ok) {
        setVehicles(res.data.vehicles);
        if (!selectedPlate && res.data.vehicles.length > 0) {
          setSelectedPlate(res.data.vehicles[0].licensePlate);
        }
      }
      setLoadingVehicles(false);
    };

    loadVehicles();
  }, [selectedPlate]);

  const selectedVehicle = vehicles.find((v) => v.licensePlate === selectedPlate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedVehicle) {
      setError("Please select a registered vehicle");
      return;
    }

    const entryTime = new Date(entryDate);
    const exitTime = new Date(exitDate);

    if (entryTime <= new Date()) {
      setError("Reservation entry time must be in the future");
      return;
    }

    if (exitTime <= entryTime) {
      setError("Expected exit time must be after the entry time");
      return;
    }

    setSubmitting(true);

    const res = await apiPost<ReserveResponse>("/api/parking/reserve", {
      licensePlate: selectedVehicle.licensePlate,
      vehicleType: selectedVehicle.type,
      expectedEntry: entryTime.toISOString(),
      expectedExit: exitTime.toISOString(),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setResult(res.data.booking);
    toast(`Bay ${res.data.booking.slot.code} reserved successfully!`, "success");
  };

  const handleReset = () => {
    setResult(null);
    setError("");
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Reserve a Parking Bay</h1>
        <p className="text-xs text-neutral-500 mt-1">Pre-book guaranteed parking with 30-minute arrival grace buffer</p>
      </div>

      {result ? (
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 mb-6 shadow-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 pb-3 border-b border-emerald-200 mb-4">
            <CheckCircle2 size={24} className="text-emerald-700" />
            <div>
              <h3 className="!m-0 text-base font-bold text-emerald-800">
                Reservation Confirmed
              </h3>
              <span className="text-[11px] text-neutral-500 font-mono">
                Booking ID: {result.id}
              </span>
            </div>
          </div>

          <div className="my-4 p-5 rounded-xl bg-white border-2 border-emerald-500 text-center shadow-xs">
            <span className="text-xs uppercase tracking-wider text-neutral-500 font-bold block mb-1">
              RESERVED BAY ALLOCATION
            </span>
            <div className="font-mono text-4xl font-extrabold text-emerald-800 tracking-tight">
              {result.slot.code}
            </div>
            <div className="text-sm font-semibold text-neutral-700 mt-1">
              {result.slot.zone?.name ?? "Zone Level"} (Level {result.slot.zone?.level ?? 0})
            </div>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm mb-6 [&>dt]:font-medium [&>dt]:text-neutral-500 [&>dd]:text-neutral-900 [&>dd]:m-0">
            <dt>Vehicle Plate:</dt>
            <dd className="font-mono text-base">{result.licensePlate}</dd>

            <dt>Reserved Arrival:</dt>
            <dd>{new Date(result.expectedEntry).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</dd>

            <dt>Reserved Departure:</dt>
            <dd>{new Date(result.expectedExit).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</dd>

            <dt>Arrival Buffer:</dt>
            <dd className="text-emerald-700 font-semibold">
              30 minutes prior to reservation time
            </dd>
          </dl>

          <div className="flex justify-end gap-3">
            <Link
              href="/member"
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Return to My Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingVehicles ? (
            <div className="text-center py-10 px-6 text-neutral-400 flex flex-col items-center justify-center">
              <Loader2 size={24} className="animate-spin text-neutral-400 mb-2" />
              <p className="text-xs text-neutral-500">Checking your fleet…</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-8 px-6 text-neutral-400 flex flex-col items-center justify-center">
              <CarFront size={32} />
              <h3 className="text-sm font-semibold text-neutral-800 mt-2 mb-1">Vehicle Registration Required</h3>
              <p className="text-xs text-neutral-500 mb-4">You need to register at least one vehicle before making a reservation.</p>
              <Link
                href="/member/vehicles"
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                Register Your Vehicle First →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Select Vehicle */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Choose Registered Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPlate}
                  onChange={(e) => setSelectedPlate(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  {vehicles.map((v) => (
                    <option key={v.licensePlate} value={v.licensePlate}>
                      {v.licensePlate} ({v.type.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Arrival DateTime */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reserve-entry" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Expected Arrival Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reserve-entry"
                    type="datetime-local"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="reserve-exit" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Expected Departure Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reserve-exit"
                    type="datetime-local"
                    required
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                <ShieldCheck size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Buffer Protection:</strong> Your allocated bay will be held exclusively for you.
                  You can arrive up to 30 minutes before your scheduled start time.
                </span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />}
                  <span>{submitting ? "Searching & Reserving Bay…" : "Confirm Reservation"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={<div className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-neutral-400 text-sm"><Loader2 size={24} className="animate-spin text-emerald-700" /><p>Loading reservation form…</p></div>}>
      <ReserveForm />
    </Suspense>
  );
}
