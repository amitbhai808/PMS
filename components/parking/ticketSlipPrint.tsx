
"use client";

import { CheckCircle2, Printer } from "lucide-react";

type TicketSlipPrintProps = {
  ticketId: string;
  licensePlate: string;
  vehicleType: string;
  slotCode: string;
  zoneName?: string;
  level?: number;
  hourlyRatePaise: number;
  expectedExit: string;
  issuedAt: Date;
};

const vehicleLabels: Record<string, string> = {
  FOUR_WHEELER: "4-Wheeler",
  TWO_WHEELER: "2-Wheeler",
  EV: "Electric vehicle",
  SUV: "SUV / Large vehicle",
};

const formatDateTime = (value: Date | string) =>
  new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

export default function TicketSlipPrint({
  ticketId,
  licensePlate,
  vehicleType,
  slotCode,
  zoneName,
  level,
  hourlyRatePaise,
  expectedExit,
  issuedAt,
}: TicketSlipPrintProps) {
  return (
    <section
      id="printable-ticket"
      aria-label="Parking ticket"
      className="w-full max-w-md overflow-hidden rounded-2xl border border-[#9ed7bd] bg-white shadow-[0_10px_30px_rgba(22,59,50,0.08)] print:max-w-none print:rounded-none print:border-0 print:shadow-none"
    >
      <div className="bg-[#006d51] px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9f6e3]">
              Parkwise parking ticket
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Entry confirmed
            </h2>
          </div>
          <CheckCircle2 className="size-7 shrink-0 text-[#71e2b7]" />
        </div>
        <div className="mt-4 border-t border-white/25 pt-3 font-mono text-xs tracking-wide text-[#d9f9ec]">
          TICKET #{ticketId.slice(-8).toUpperCase()}
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-xl border-2 border-dashed border-[#00a274] bg-[#effcf7] px-4 py-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#658276]">
            Proceed to bay
          </p>
          <p className="mt-1 font-mono text-5xl font-black tracking-tight text-[#163B32]">
            {slotCode}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#235347]">
            {zoneName ?? "Parking zone"}
            {level !== undefined ? ` · Level ${level}` : ""}
          </p>
        </div>

        <dl className="mt-5 divide-y divide-[#e4eee8] text-sm">
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-[#658276]">Vehicle</dt>
            <dd className="m-0 font-mono text-base font-bold text-[#163B32]">
              {licensePlate}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-[#658276]">Type</dt>
            <dd className="m-0 text-right font-semibold text-[#163B32]">
              {vehicleLabels[vehicleType] ?? vehicleType}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-[#658276]">Entry time</dt>
            <dd className="m-0 text-right font-semibold text-[#163B32]">
              {formatDateTime(issuedAt)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-[#658276]">Expected exit</dt>
            <dd className="m-0 text-right font-semibold text-[#163B32]">
              {formatDateTime(expectedExit)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-[#658276]">Parking rate</dt>
            <dd className="m-0 font-semibold text-[#163B32]">
              ₹{(hourlyRatePaise / 100).toFixed(2)} / hour
            </dd>
          </div>
        </dl>

        <p className="mt-5 border-t border-dashed border-[#ccebd9] pt-4 text-center text-[11px] leading-relaxed text-[#658276]">
          Keep this slip with you. Present it at exit for a quick checkout.
        </p>

        <button
          type="button"
          onClick={() => window.print()}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00845f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#006d51] print:hidden"
        >
          <Printer className="size-4" /> Print ticket
        </button>
      </div>
    </section>
  );
}
