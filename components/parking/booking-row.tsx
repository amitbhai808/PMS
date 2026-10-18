"use client";

import Link from "next/link";
import { Car, DoorClosed, ArrowRightLeft, Clock, ShieldCheck, XCircle } from "lucide-react";
import { OverstayBadge } from "./overstay-badge";

export type Booking = {
  id: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  userId: string | null;
  licensePlate: string;
  slotId: string;
  expectedEntry: string;
  expectedExit: string;
  actualEntry: string | null;
  actualExit: string | null;
  hourlyRatePaise: number;
  baseFeePaise: number;
  penaltyFeePaise: number;
  totalPaidPaise: number;
  paymentStatus: "PAID" | "UNPAID";
  slot?: {
    code: string;
    zone?: {
      name: string;
      level: number;
    };
  };
  vehicle?: {
    licensePlate: string;
    type: string;
  } | null;
};

type BookingRowProps = {
  booking: Booking;
  onCancel?: (bookingId: string) => void;
};

export function BookingRow({ booking, onCancel }: BookingRowProps) {
  const isOverdue =
    booking.status === "ACTIVE" &&
    !booking.actualExit &&
    new Date(booking.expectedExit) < new Date();

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  return (
    <tr className={isOverdue ? "overstay-row" : ""}>
      {/* Plate & Type */}
      <td>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold tracking-wider text-sm px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300">
            {booking.licensePlate}
          </span>
          {booking.vehicle && (
            <span className="text-[10px] text-neutral-500 uppercase tracking-tight">
              {booking.vehicle.type.replace("_", " ")}
            </span>
          )}
        </div>
      </td>

      {/* Slot & Zone */}
      <td>
        {booking.slot ? (
          <div>
            <span className="font-bold text-neutral-800 text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {booking.slot.code}
            </span>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              {booking.slot.zone?.name ?? `Level ${booking.slot.zone?.level ?? 0}`}
            </div>
          </div>
        ) : (
          <span className="text-neutral-400 text-xs">Unassigned</span>
        )}
      </td>

      {/* Entry */}
      <td>
        <div className="text-xs">
          <span className="font-medium text-neutral-800">
            {formatDate(booking.actualEntry ?? booking.expectedEntry)}
          </span>
          <div className="text-[10px] text-neutral-400">
            {booking.actualEntry ? "Recorded arrival" : "Expected arrival"}
          </div>
        </div>
      </td>

      {/* Exit & Overstay */}
      <td>
        <div className="text-xs">
          <span className="font-medium text-neutral-800">
            {formatDate(booking.actualExit ?? booking.expectedExit)}
          </span>
          <div className="mt-1">
            <OverstayBadge
              expectedExit={booking.expectedExit}
              actualExit={booking.actualExit}
              status={booking.status}
            />
          </div>
        </div>
      </td>

      {/* Rate */}
      <td>
        <div className="text-xs font-semibold text-neutral-700">
          {formatCurrency(booking.hourlyRatePaise)}/hr
        </div>
        {booking.totalPaidPaise > 0 && (
          <div className="text-[10px] text-emerald-600 font-medium">
            Paid: {formatCurrency(booking.totalPaidPaise)}
          </div>
        )}
      </td>

      {/* Status */}
      <td>
        <div className="flex flex-col gap-1 items-start">
          <span className={`status-badge ${booking.status.toLowerCase()}`}>
            {booking.status}
          </span>
          <span className={`status-badge ${booking.paymentStatus.toLowerCase()} !text-[9px] !py-0.5`}>
            {booking.paymentStatus}
          </span>
        </div>
      </td>

      {/* Quick Actions */}
      <td>
        <div className="flex items-center gap-1.5">
          {booking.status === "ACTIVE" && (
            <>
              <Link
                href={`/dashboard/exit?plate=${encodeURIComponent(booking.licensePlate)}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                title="Process vehicle departure"
              >
                <DoorClosed size={12} /> Exit
              </Link>
              <Link
                href={`/dashboard/reassign?bookingId=${encodeURIComponent(booking.id)}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors"
                title="Reassign to another slot"
              >
                <ArrowRightLeft size={12} />
              </Link>
            </>
          )}

          {booking.status === "PENDING" && (
            <>
              <Link
                href={`/dashboard/entry?plate=${encodeURIComponent(booking.licensePlate)}&reservationId=${encodeURIComponent(booking.id)}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                title="Check in this reservation"
              >
                <ShieldCheck size={12} /> Check-In
              </Link>
              {onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(booking.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                  title="Cancel reservation"
                >
                  <XCircle size={12} /> Cancel
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
