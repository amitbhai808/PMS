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
    <div className="dash-panel">
      <div className="dash-panel-header flex-wrap gap-2">
        <div>
          <h3 className="dash-panel-title flex items-center gap-2">
            <Layers size={16} className="text-emerald-700" />
            {zoneName ? `Zone: ${zoneName}` : "Parking Bay Overview"}
          </h3>
          <p className="dash-panel-subtitle">
            {total} total parking slots configured in this section
          </p>
        </div>

        {/* Quick summary badges */}
        <div className="slot-zone-summary !border-0 !p-0 !m-0 flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 text-xs text-neutral-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-700" />
            <strong>{available}</strong> available
          </span>
          <span className="flex items-center gap-1.5 text-xs text-neutral-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
            <Car size={13} className="text-red-600" />
            <strong>{occupied}</strong> occupied
          </span>
          {maintenance > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-neutral-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              <Wrench size={13} className="text-amber-600" />
              <strong>{maintenance}</strong> maintenance
            </span>
          )}
          {shadow > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-neutral-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
              <strong>{shadow}</strong> shadow overflow
            </span>
          )}
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="dash-empty py-12">
          <Layers size={32} />
          <h3>No slots found</h3>
          <p>No parking slots meet the selected filter criteria.</p>
        </div>
      ) : (
        <div className="slot-grid mt-4">
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
