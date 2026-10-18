"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";

type OverstayBadgeProps = {
  expectedExit: string | Date;
  actualExit?: string | Date | null;
  status: string;
};

export function OverstayBadge({ expectedExit, actualExit, status }: OverstayBadgeProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    // Tick every minute to keep overdue duration accurate
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (status !== "ACTIVE" || actualExit) {
    return null;
  }

  const exitTime = new Date(expectedExit).getTime();
  const diffMs = now.getTime() - exitTime;

  if (diffMs <= 0) {
    // Not overdue yet
    const remainingMinutes = Math.ceil(-diffMs / 60_000);
    if (remainingMinutes <= 15) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-amber-50 text-amber-800 border border-amber-200"
          title={`Departs in ${remainingMinutes}m`}
        >
          <Clock size={12} /> {remainingMinutes}m left
        </span>
      );
    }
    return null;
  }

  const overdueMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(overdueMinutes / 60);
  const minutes = overdueMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m overdue` : `${minutes}m overdue`;

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-red-50 text-red-700 border border-red-200"
      title={`Exceeded expected exit by ${label}`}
    >
      <AlertTriangle size={12} /> {label}
    </span>
  );
}
