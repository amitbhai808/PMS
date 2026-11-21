"use client";

import Image from "next/image";
import { Zap, Car, Sparkles, Accessibility, Wrench } from "lucide-react";

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

export type VehicleVisual = {
  src: string;
  alt: string;
  name: string;
};

export function getSlotVehicle(slot: Slot): VehicleVisual {
  if (slot.allowedVehicleType === "TWO_WHEELER") {
    return { src: "/vehicles/two-wheeler.png", alt: "Two-Wheeler Parked", name: "2-Wheeler" };
  }
  if (slot.allowedVehicleType === "EV" || slot.slotType === "EV_CHARGING") {
    return { src: "/vehicles/ev.png", alt: "Electric Vehicle Parked", name: "EV" };
  }
  if (slot.allowedVehicleType === "SUV") {
    return { src: "/vehicles/suv.png", alt: "SUV Parked", name: "SUV" };
  }
  if (slot.slotType === "VIP") {
    return { src: "/vehicles/sports.png", alt: "VIP Sports Car Parked", name: "VIP Coupe" };
  }
  // For FOUR_WHEELER or ANY: alternate deterministically by slot code for visual variety
  const hash = slot.code.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  if (hash % 3 === 0) {
    return { src: "/vehicles/sports.png", alt: "Sports Car Parked", name: "Coupe" };
  } else if (hash % 3 === 1) {
    return { src: "/vehicles/suv.png", alt: "SUV Parked", name: "SUV" };
  }
  return { src: "/vehicles/car.png", alt: "Sedan Parked", name: "Sedan" };
}

type SlotCardProps = {
  slot: Slot;
  onClick?: (slot: Slot) => void;
  selected?: boolean;
};

export function SlotCard({ slot, onClick, selected }: SlotCardProps) {
  const vehicle = getSlotVehicle(slot);

  const getCardStatusStyles = () => {
    if (slot.isShadowPool) return "border-purple-200 bg-purple-50/40";
    switch (slot.status) {
      case "AVAILABLE":
        return "border-emerald-200 bg-white hover:border-emerald-400";
      case "OCCUPIED":
        return "border-rose-200 bg-rose-50/30 hover:border-rose-400";
      case "MAINTENANCE":
        return "border-amber-200 bg-amber-50/30 hover:border-amber-400";
      default:
        return "border-neutral-200 bg-white";
    }
  };

  const getSlotTypeIcon = () => {
    switch (slot.slotType) {
      case "EV_CHARGING":
        return <span title="EV Charging"><Zap size={13} className="text-emerald-600" /></span>;
      case "VIP":
        return <span title="VIP Reserved"><Sparkles size={13} className="text-amber-500" /></span>;
      case "ACCESSIBLE":
        return <span title="Accessible"><Accessibility size={13} className="text-blue-500" /></span>;
      default:
        return <span title="Regular Slot"><Car size={13} className="text-neutral-400" /></span>;
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
      className={`rounded-xl border p-2.5 text-center transition-all duration-150 hover:shadow-md select-none flex flex-col justify-between ${getCardStatusStyles()} ${
        selected ? "ring-2 ring-emerald-600 shadow-md" : "shadow-2xs"
      } ${onClick ? "cursor-pointer hover:scale-[1.02]" : "cursor-default"}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(slot);
        }
      }}
    >
      {/* Header with Slot Code & Icon */}
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-bold text-neutral-900 tracking-tight">{slot.code}</span>
          <span className="flex items-center gap-1">
            {getSlotTypeIcon()}
            {slot.isShadowPool && (
              <span
                className="text-[8px] font-bold px-1 rounded bg-purple-100 text-purple-700 leading-tight"
                title="Shadow overflow reserve pool"
              >
                SHADOW
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between text-[9px] text-neutral-400">
          <span className="uppercase font-medium truncate">{slot.slotType.replace("_", " ")}</span>
          <span className="truncate">{formatVehicleType(slot.allowedVehicleType)}</span>
        </div>
      </div>

      {/* Realistic Parking Bay Visualization */}
      <div className="my-2 py-1 px-1 rounded-lg bg-neutral-100/70 border border-dashed border-neutral-300/70 relative flex flex-col items-center justify-center min-h-[76px] overflow-hidden">
        {slot.status === "OCCUPIED" ? (
          <div className="flex flex-col items-center justify-center w-full py-0.5 animate-in fade-in duration-200">
            <Image
              src={vehicle.src}
              alt={vehicle.alt}
              width={60}
              height={120}
              className="h-14 w-auto object-contain transition-transform duration-200 hover:scale-105"
              style={{ filter: "drop-shadow(0px 3px 5px rgba(0,0,0,0.22))" }}
              unoptimized
            />
            <span className="text-[9px] font-semibold text-neutral-700 bg-white/95 px-1.5 py-0.5 rounded shadow-2xs mt-1 border border-neutral-200 leading-none">
              {vehicle.name}
            </span>
          </div>
        ) : slot.status === "MAINTENANCE" ? (
          <div className="flex flex-col items-center justify-center py-2 text-amber-600">
            <Wrench size={18} className="mb-1 opacity-70" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Blocked</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 text-emerald-700/60">
            <span className="w-5 h-7 rounded-xs border-2 border-dashed border-emerald-400/80 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-600 mb-0.5 bg-emerald-50/40">
              P
            </span>
            <span className="text-[9px] font-medium text-emerald-700">Empty Bay</span>
          </div>
        )}
      </div>

      {/* Footer info: distance & status */}
      <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[10px]">
        <span className="text-neutral-400 text-[9px]">{slot.distanceToGate}m gate</span>
        <span
          className={`font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded ${
            slot.status === "AVAILABLE"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : slot.status === "OCCUPIED"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {slot.status}
        </span>
      </div>
    </div>
  );
}
