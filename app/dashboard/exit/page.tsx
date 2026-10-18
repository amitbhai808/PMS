"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  DoorClosed,
  CarFront,
  QrCode,
  Wallet,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Search,
  Clock,
  ArrowRight,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";
import { BillingCard, BillingData } from "@/components/parking/billing-card";
import { Booking } from "@/components/parking/booking-row";

type ExitResponse = {
  message: string;
  booking: {
    id: string;
    status: string;
    actualExit: string;
    slot: {
      code: string;
    };
  };
  billing: BillingData;
  paymentMethod: "UPI" | "WALLET";
  upiString?: string | null;
};

function ExitForm() {
  const searchParams = useSearchParams();
  const initialPlate = searchParams.get("plate") ?? "";
  const initialBookingId = searchParams.get("bookingId") ?? "";

  const [activeVehicles, setActiveVehicles] = useState<Booking[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);

  const [searchMethod, setSearchMethod] = useState<"plate" | "select">("select");
  const [licensePlate, setLicensePlate] = useState(initialPlate);
  const [bookingId, setBookingId] = useState(initialBookingId);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "WALLET">("UPI");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [exitResult, setExitResult] = useState<{
    response: ExitResponse;
    plate: string;
  } | null>(null);

  const { toast } = useToast();

  const loadActiveVehicles = async () => {
    setLoadingActive(true);
    const res = await apiGet<{ bookings: Booking[] }>("/api/bookings?status=ACTIVE&take=50");
    if (res.ok) {
      setActiveVehicles(res.data.bookings);
    }
    setLoadingActive(false);
  };

  useEffect(() => {
    loadActiveVehicles();
  }, []);

  useEffect(() => {
    if (initialPlate) {
      setLicensePlate(initialPlate);
      setSearchMethod("plate");
    }
    if (initialBookingId) {
      setBookingId(initialBookingId);
    }
  }, [initialPlate, initialBookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      paymentMethod,
    };

    if (bookingId.trim()) {
      payload.bookingId = bookingId.trim();
    } else if (licensePlate.trim()) {
      payload.licensePlate = licensePlate.trim().toUpperCase().replace(/\s+/g, "");
    } else {
      setError("Please select or enter a vehicle plate number or booking ID");
      setSubmitting(false);
      return;
    }

    const res = await apiPost<ExitResponse>("/api/parking/exit", payload);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    const plateUsed = licensePlate || activeVehicles.find((b) => b.id === bookingId)?.licensePlate || "Vehicle";
    setExitResult({
      response: res.data,
      plate: plateUsed,
    });

    toast(`Exit recorded for ${plateUsed}!`, "success");
    await loadActiveVehicles();
  };

  const handleReset = () => {
    setLicensePlate("");
    setBookingId("");
    setExitResult(null);
    setError("");
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-800 tracking-tight m-0">Exit Gate Departure & Billing</h1>
        <p className="text-neutral-500 text-xs sm:text-sm mt-1 mb-0">Complete parking session, compute duration and overstay fees, and collect payment</p>
      </div>

      {exitResult ? (
        <BillingCard
          licensePlate={exitResult.plate}
          slotCode={exitResult.response.booking.slot?.code}
          billing={exitResult.response.billing}
          paymentMethod={exitResult.response.paymentMethod}
          upiString={exitResult.response.upiString}
          onDone={handleReset}
        />
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-xs">
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
            {/* Mode Selector */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <button
                type="button"
                onClick={() => setSearchMethod("select")}
                className={`px-3.5 py-1.5 border rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  searchMethod === "select"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                    : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                Pick from Parked Vehicles ({activeVehicles.length})
              </button>
              <button
                type="button"
                onClick={() => setSearchMethod("plate")}
                className={`px-3.5 py-1.5 border rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  searchMethod === "plate"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                    : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                Type Plate or ID Manually
              </button>
            </div>

            {searchMethod === "select" ? (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Select Departing Vehicle <span className="text-red-500">*</span>
                </label>
                {loadingActive ? (
                  <div className="p-4 text-xs text-neutral-500 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-emerald-700" /> Loading parked vehicles…
                  </div>
                ) : activeVehicles.length === 0 ? (
                  <div className="p-4 rounded-lg bg-neutral-50 text-xs text-neutral-500 border border-neutral-200">
                    No active vehicles currently parked. You can switch to manual entry if needed.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {activeVehicles.map((vehicle) => {
                      const isSelected = bookingId === vehicle.id;
                      const isOverdue =
                        new Date(vehicle.expectedExit) < new Date() && !vehicle.actualExit;

                      return (
                        <div
                          key={vehicle.id}
                          onClick={() => {
                            setBookingId(vehicle.id);
                            setLicensePlate(vehicle.licensePlate);
                          }}
                          className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/70 font-semibold"
                              : "border-neutral-200 bg-white hover:bg-neutral-50"
                          } ${isOverdue ? "border-l-4 border-l-red-500" : ""}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300">
                              {vehicle.licensePlate}
                            </span>
                            <span className="text-neutral-600">
                              Bay <strong>{vehicle.slot?.code}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isOverdue && (
                              <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                Overstay
                              </span>
                            )}
                            <span className="text-neutral-400 text-[11px]">
                              In since {new Date(vehicle.actualEntry ?? vehicle.expectedEntry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="exit-plate" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  License Plate Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="exit-plate"
                  type="text"
                  value={licensePlate}
                  onChange={(e) => {
                    setLicensePlate(e.target.value.toUpperCase());
                    setBookingId(""); // Clear booking ID when plate typed manually
                  }}
                  placeholder="e.g. MH12AB1234"
                  required={!bookingId}
                  className="w-full text-base font-mono tracking-wider p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Settlement Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("UPI")}
                  className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                    paymentMethod === "UPI"
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold"
                      : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <QrCode size={18} className={paymentMethod === "UPI" ? "text-emerald-700" : "text-neutral-400"} />
                  <div>
                    <div className="text-xs font-semibold">UPI Payment</div>
                    <div className="text-[10px] text-neutral-500">QR code / PhonePe / GPay</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("WALLET")}
                  className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                    paymentMethod === "WALLET"
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold"
                      : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <Wallet size={18} className={paymentMethod === "WALLET" ? "text-emerald-700" : "text-neutral-400"} />
                  <div>
                    <div className="text-xs font-semibold">Member Wallet</div>
                    <div className="text-[10px] text-neutral-500">Auto-debit registered user</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="submit"
                disabled={submitting || (!bookingId && !licensePlate.trim())}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <DoorClosed size={16} />}
                <span>{submitting ? "Calculating & Billing…" : "Process Departure & Release Bay"}</span>
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

export default function ExitGatePage() {
  return (
    <Suspense fallback={<div className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-neutral-400 text-sm"><Loader2 size={24} className="animate-spin text-emerald-700" /><p>Loading exit kiosk…</p></div>}>
      <ExitForm />
    </Suspense>
  );
}
