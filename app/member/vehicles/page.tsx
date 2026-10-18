"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Car,
  CarFront,
  Zap,
  Sparkles,
  Clock,
  Plus,
  Loader2,
  AlertCircle,
  CalendarCheck,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";

type VehicleRecord = {
  id: string;
  licensePlate: string;
  type: "FOUR_WHEELER" | "TWO_WHEELER" | "EV" | "SUV";
  createdAt: string;
};

export default function MemberVehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleType, setVehicleType] = useState<"FOUR_WHEELER" | "TWO_WHEELER" | "EV" | "SUV">("FOUR_WHEELER");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { toast } = useToast();

  const loadVehicles = async () => {
    setLoading(true);
    const res = await apiGet<{ vehicles: VehicleRecord[] }>("/api/member/register-vehicle");
    if (res.ok) {
      setVehicles(res.data.vehicles);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPlate = licensePlate.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanPlate) {
      setError("Please provide a valid license plate number");
      return;
    }

    setSubmitting(true);

    const res = await apiPost<{ vehicle: VehicleRecord }>("/api/member/register-vehicle", {
      licensePlate: cleanPlate,
      type: vehicleType,
    });

    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    toast(`Vehicle ${cleanPlate} registered to your profile!`, "success");
    setLicensePlate("");
    await loadVehicles();
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "EV":
        return <Zap size={18} className="text-emerald-600" />;
      case "SUV":
        return <Sparkles size={18} className="text-purple-600" />;
      case "TWO_WHEELER":
        return <Clock size={18} className="text-amber-600" />;
      default:
        return <CarFront size={18} className="text-blue-600" />;
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="dash-page-header">
        <h1>My Registered Vehicles</h1>
        <p>Register your vehicle license plates to enable fast automated gate entry and bay reservations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Register Vehicle Form */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <div>
              <h3 className="dash-panel-title flex items-center gap-2">
                <Plus size={16} className="text-emerald-700" />
                Add New Vehicle
              </h3>
              <p className="dash-panel-subtitle">Link plate to your member profile</p>
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
              <label htmlFor="reg-plate" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                License Plate Number <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-plate"
                type="text"
                required
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="e.g. DL8CAF5030"
                className="w-full text-base font-mono tracking-wider p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                ANPR entrance camera matches this plate automatically on arrival.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Vehicle Classification <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "FOUR_WHEELER", label: "4-Wheeler Sedan / Hatch", icon: CarFront },
                  { id: "TWO_WHEELER", label: "2-Wheeler Motorcycle / Scooter", icon: Clock },
                  { id: "EV", label: "Electric Vehicle (EV)", icon: Zap },
                  { id: "SUV", label: "SUV / Tall Vehicle", icon: Sparkles },
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
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold"
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

            <button
              type="submit"
              disabled={submitting}
              className="dash-form-submit w-full mt-2"
            >
              {submitting ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              <span>{submitting ? "Registering…" : "Register Vehicle"}</span>
            </button>
          </form>
        </div>

        {/* Existing Vehicles List */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <div>
              <h3 className="dash-panel-title">Your Fleet ({vehicles.length})</h3>
              <p className="dash-panel-subtitle">Vehicles authorized under this account</p>
            </div>
          </div>

          {loading ? (
            <div className="dash-empty py-10">
              <Loader2 size={24} className="spin text-neutral-400 mb-2" />
              <p>Loading vehicles…</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="dash-empty py-10">
              <Car size={32} />
              <h3>No Vehicles Registered</h3>
              <p>Register your first vehicle using the form to start booking parking.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((v) => (
                <div
                  key={v.licensePlate}
                  className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-white border border-neutral-200 flex items-center justify-center flex-shrink-0">
                      {getVehicleIcon(v.type)}
                    </div>
                    <div>
                      <strong className="font-mono text-sm tracking-wider text-neutral-900 block">
                        {v.licensePlate}
                      </strong>
                      <span className="text-xs text-neutral-500 uppercase">
                        {v.type.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/member/reserve?plate=${encodeURIComponent(v.licensePlate)}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-2xs"
                  >
                    <CalendarCheck size={13} />
                    <span>Reserve</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
