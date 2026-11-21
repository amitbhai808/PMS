"use client";

import { Slot, SlotCard } from "./slot-card";
import { CheckCircle2, Car, Wrench, Layers } from "lucide-react";

type SlotGridProps = {
  slots: Slot[];
  zoneName?: string;
  onSelectSlot?: (slot: Slot) => void;
  selectedSlotId?: string;
};

export function SlotGrid({ slots, zoneName, onSelectSlot, selectedSlotId }: SlotGridProps) {
  const total = slots.length;
  const available = slots.filter((s) => s.status === "AVAILABLE" && !s.isShadowPool).length;
  const occupied = slots.filter((s) => s.status === "OCCUPIED" && !s.isShadowPool).length;
  const maintenance = slots.filter((s) => s.status === "MAINTENANCE").length;
  const shadow = slots.filter((s) => s.isShadowPool).length;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-neutral-800 m-0 flex items-center gap-2">
            <Layers size={16} className="text-emerald-700" />
            {zoneName ? `Zone: ${zoneName}` : "Parking Bay Overview"}
          </h3>
          <p className="text-[11px] text-neutral-500 m-0 mt-0.5">
            {total} total parking slots configured in this section
          </p>
        </div>

        {/* Quick summary badges */}
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 text-xs text-neutral-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-700" />
            <strong className="text-neutral-800 font-bold">{available}</strong> available
          </span>
          <span className="flex items-center gap-1.5 text-xs text-neutral-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
            <Car size={13} className="text-red-600" />
            <strong className="text-neutral-800 font-bold">{occupied}</strong> occupied
          </span>
          {maintenance > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-neutral-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              <Wrench size={13} className="text-amber-600" />
              <strong className="text-neutral-800 font-bold">{maintenance}</strong> maintenance
            </span>
          )}
          {shadow > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-neutral-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
              <strong className="text-neutral-800 font-bold">{shadow}</strong> shadow overflow
            </span>
          )}
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-12 px-6 text-neutral-400">
          <Layers size={32} className="mx-auto mb-3 text-neutral-300" />
          <h3 className="m-0 mb-1.5 text-neutral-600 text-[15px] font-semibold">No slots found</h3>
          <p className="m-0 text-[13px] text-neutral-500">No parking slots meet the selected filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3 mt-4">
          {slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              onClick={onSelectSlot}
              selected={slot.id === selectedSlotId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
