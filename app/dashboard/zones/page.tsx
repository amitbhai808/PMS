"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Plus,
  RefreshCw,
  Layers3,
  ShieldAlert,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast";

type ZoneRecord = {
  id: string;
  name: string;
  level: number;
  isCovered: boolean;
  clearanceHeight: number | null;
  _count?: {
    slots: number;
  };
};

export default function ZoneManagementPage() {
  const { user } = useAuth();
  const [zones, setZones] = useState<ZoneRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create Zone Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<number>(0);
  const [isCovered, setIsCovered] = useState(true);
  const [clearanceHeight, setClearanceHeight] = useState<string>("2.1");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const { toast } = useToast();

  const loadZones = async () => {
    setRefreshing(true);
    const res = await apiGet<{ zones: ZoneRecord[] }>("/api/zones");
    if (res.ok) {
      setZones(res.data.zones);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadZones();
  }, []);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    setModalLoading(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      level: Number(level),
      isCovered,
    };
    if (clearanceHeight) {
      payload.clearanceHeight = Number(clearanceHeight);
    }

    const res = await apiPost<{ zone: ZoneRecord }>("/api/zones", payload);
    setModalLoading(false);

    if (!res.ok) {
      setModalError(res.error);
      return;
    }

    toast(`Zone "${name}" created successfully!`, "success");
    setIsModalOpen(false);
    setName("");
    setLevel(0);
    setIsCovered(true);
    setClearanceHeight("2.1");
    await loadZones();
  };

  if (user && user.role !== "SUPERADMIN") {
    return (
      <div className="text-center py-16 px-6 text-neutral-400 flex flex-col items-center justify-center">
        <ShieldAlert size={36} className="text-red-500 mb-2" />
        <h3 className="text-sm font-semibold text-neutral-800 mt-2 mb-1">Access Restricted</h3>
        <p className="text-xs text-neutral-500">Facility zone configuration is restricted to SuperAdmin accounts.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Facility Zones & Levels</h1>
          <p className="text-xs text-neutral-500 mt-1">Configure parking structure floors, height clearances, and bay distribution</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Create New Zone</span>
          </button>

          <button
            onClick={loadZones}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Zones List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 px-6 text-neutral-400 flex flex-col items-center justify-center">
            <Loader2 size={24} className="animate-spin text-neutral-400 mb-2" />
            <p className="text-xs text-neutral-500">Loading zones…</p>
          </div>
        ) : zones.length === 0 ? (
          <div className="col-span-full text-center py-12 px-6 text-neutral-400 flex flex-col items-center justify-center">
            <MapPin size={32} />
            <h3 className="text-sm font-semibold text-neutral-800 mt-2 mb-1">No Zones Configured</h3>
            <p className="text-xs text-neutral-500">Create your first facility parking zone using the button above.</p>
          </div>
        ) : (
          zones.map((zone) => (
            <div
              key={zone.id}
              className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-base text-neutral-900">{zone.name}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                    Level {zone.level}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-neutral-600 mb-4">
                  <div className="flex justify-between">
                    <span>Enclosure:</span>
                    <strong>{zone.isCovered ? "Covered Indoor" : "Open Rooftop"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Clearance Height:</span>
                    <strong>{zone.clearanceHeight ? `${zone.clearanceHeight}m` : "Unrestricted"}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                <span className="text-neutral-500">Configured Bays:</span>
                <span className="font-bold text-emerald-800 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                  {zone._count?.slots ?? 0} slots
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Zone Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-emerald-700" />
                <h3 className="text-sm font-bold text-neutral-900 !m-0">Create Parking Zone</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{modalError}</div>
            )}

            <form onSubmit={handleCreateZone} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Zone / Section Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Basement 2 or Rooftop Deck A"
                  className="w-full text-xs p-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Floor Level (-10 to 50) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={-10}
                  max={50}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  placeholder="e.g. -2 for Basement 2, 0 for Ground, 1 for Level 1"
                  className="w-full text-xs p-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Clearance Height in Meters (Optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1.5}
                  max={10.0}
                  value={clearanceHeight}
                  onChange={(e) => setClearanceHeight(e.target.value)}
                  placeholder="e.g. 2.1"
                  className="w-full text-xs p-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  SUV and tall vehicles will automatically avoid zones with clearance below 2.0m.
                </span>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCovered}
                    onChange={(e) => setIsCovered(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Covered / Roofed Parking Zone
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3 rounded-lg border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="inline-flex items-center justify-center gap-1.5 h-8 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {modalLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Save Zone</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
