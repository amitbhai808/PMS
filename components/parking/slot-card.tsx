"use client";

import { Zap, Car, ShieldAlert, Sparkles, Accessibility } from "lucide-react";

export type Slot = {
  id: string;
  code: string;
  zoneId: string;
  slotType: "REGULAR" | "VIP" | "EV_CHARGING" | "ACCESSIBLE";
  allowedVehicleType: "ANY" | "TWO_WHEELER" | "FOUR_WHEELER" | "EV" | "SUV";
  distanceToGate: number;
  isShadowPool: boolean;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  dedicatedUserId: string | null;
  zone?: {
    id: string;
    name: string;
    level: number;
  };
};

type SlotCardProps = {
  slot: Slot;
  onClick?: (slot: Slot) => void;
  selected?: boolean;
};

export function SlotCard({ slot, onClick, selected }: SlotCardProps) {
  const getCardStatusStyles = () => {
    if (slot.isShadowPool) return "border-purple-200 bg-purple-50/50";
    switch (slot.status) {
      case "AVAILABLE":
        return "border-emerald-200 bg-emerald-50/40";
      case "OCCUPIED":
        return "border-red-200 bg-red-50/40";
      case "MAINTENANCE":
        return "border-amber-200 bg-amber-50/40";
      default:
        return "border-neutral-200 bg-white";
    }
  };

  const getSlotTypeIcon = () => {
    switch (slot.slotType) {
      case "EV_CHARGING":
        return <span title="EV Charging"><Zap size={14} className="text-emerald-600" /></span>;
      case "VIP":
        return <span title="VIP Reserved"><Sparkles size={14} className="text-amber-500" /></span>;
      case "ACCESSIBLE":
        return <span title="Accessible"><Accessibility size={14} className="text-blue-500" /></span>;
      default:
        return <span title="Regular Slot"><Car size={14} className="text-neutral-400" /></span>;
    }
  };

  const formatVehicleType = (type: string) => {
    switch (type) {
      case "ANY":
        return "All Types";
      case "FOUR_WHEELER":
        return "4-Wheeler";
      case "TWO_WHEELER":
        return "2-Wheeler";
      case "EV":
        return "EV Only";
      case "SUV":
        return "SUV";
      default:
        return type;
    }
  };

  return (
    <div
      onClick={() => onClick?.(slot)}
      className={`rounded-lg border p-3 text-center transition-all duration-150 hover:shadow-md select-none ${getCardStatusStyles()} ${
        selected ? "ring-2 ring-emerald-600 shadow-md" : ""
      } ${onClick ? "cursor-pointer hover:border-emerald-600" : "cursor-default"}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(slot);
        }
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-neutral-800 tracking-tight">{slot.code}</span>
        <span className="flex items-center gap-1">
          {getSlotTypeIcon()}
          {slot.isShadowPool && (
            <span
              className="text-[9px] font-bold px-1 rounded bg-purple-100 text-purple-700"
              title="Shadow overflow reserve pool"
            >
              SHADOW
            </span>
          )}
        </span>
      </div>

      <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5 font-medium">{slot.slotType.replace("_", " ")}</div>
      <div className="text-[10px] text-neutral-400 mt-px">{formatVehicleType(slot.allowedVehicleType)}</div>

      <div className="mt-2 pt-1 border-t border-dashed border-neutral-200 flex items-center justify-between text-[10px]">
        <span className="text-neutral-500">{slot.distanceToGate}m gate</span>
        <span className={`font-semibold uppercase tracking-wider text-[9px] ${
          slot.status === "AVAILABLE"
            ? "text-emerald-700"
            : slot.status === "OCCUPIED"
            ? "text-red-600"
            : "text-amber-700"
        }`}>
          {slot.status}
        </span>
      </div>
    </div>
  );
}
