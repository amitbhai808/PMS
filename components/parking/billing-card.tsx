"use client";

import { CheckCircle2, QrCode, Copy, Check, Printer, Wallet, ArrowRight } from "lucide-react";
import { useState } from "react";

export type BillingData = {
  actualMinutes?: number;
  overstayMinutes?: number;
  graceMinutes?: number;
  baseFeePaise?: number;
  penaltyFeePaise?: number;
  totalDuePaise: number;
  baseFee?: number;
  penaltyFee?: number;
  totalDue: number;
  currency: string;
};

type BillingCardProps = {
  licensePlate: string;
  slotCode?: string;
  billing: BillingData;
  paymentMethod: "UPI" | "WALLET" | string;
  upiString?: string | null;
  onDone?: () => void;
};

export function BillingCard({
  licensePlate,
  slotCode,
  billing,
  paymentMethod,
  upiString,
  onDone,
}: BillingCardProps) {
  const [copied, setCopied] = useState(false);

  const formatMinutes = (minutes?: number) => {
    if (!minutes && minutes !== 0) return "—";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleCopyUpi = () => {
    if (upiString) {
      navigator.clipboard.writeText(upiString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="dash-result-card print:border-none print:shadow-none">
      <div className="flex items-center justify-between pb-3 border-b border-emerald-200 mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={22} className="text-emerald-700" />
          <h3 className="!m-0 text-base font-bold text-emerald-800">
            Exit Settled Successfully
          </h3>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="print:hidden text-xs flex items-center gap-1 text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded px-2 py-1 bg-white"
        >
          <Printer size={12} /> Print Receipt
        </button>
      </div>

      <dl className="dash-result-detail mb-4">
        <dt>Vehicle Plate:</dt>
        <dd className="font-mono text-sm tracking-wide">{licensePlate}</dd>

        {slotCode && (
          <>
            <dt>Released Slot:</dt>
            <dd className="font-semibold text-emerald-800">{slotCode}</dd>
          </>
        )}

        <dt>Total Duration:</dt>
        <dd>{formatMinutes(billing.actualMinutes)}</dd>

        {billing.overstayMinutes && billing.overstayMinutes > 0 ? (
          <>
            <dt className="text-red-600 font-semibold">Overstay Duration:</dt>
            <dd className="text-red-600 font-semibold">
              +{formatMinutes(billing.overstayMinutes)} (exceeded expected exit)
            </dd>
          </>
        ) : null}

        <dt>Payment Method:</dt>
        <dd>
          {paymentMethod === "WALLET" ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <Wallet size={14} /> Member Wallet (Auto-debited)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
              <QrCode size={14} /> UPI Online Payment
            </span>
          )}
        </dd>
      </dl>

      {/* Breakdown Grid */}
      <div className="billing-grid">
        <div className="billing-item">
          <div className="billing-label">Base Parking Fee</div>
          <div className="billing-value">₹{(billing.baseFee ?? (billing.baseFeePaise ? billing.baseFeePaise / 100 : 0)).toFixed(2)}</div>
        </div>

        <div className="billing-item">
          <div className="billing-label">Overstay Penalty</div>
          <div className={`billing-value ${(billing.penaltyFee ?? 0) > 0 ? "penalty" : ""}`}>
            ₹{(billing.penaltyFee ?? (billing.penaltyFeePaise ? billing.penaltyFeePaise / 100 : 0)).toFixed(2)}
          </div>
        </div>

        <div className="billing-item billing-total">
          <div className="billing-label font-bold text-emerald-800">Total Settlement Due</div>
          <div className="billing-value total">
            ₹{(billing.totalDue ?? (billing.totalDuePaise ? billing.totalDuePaise / 100 : 0)).toFixed(2)}
          </div>
        </div>
      </div>

      {/* UPI QR & Payment prompt */}
      {paymentMethod === "UPI" && upiString && (
        <div className="mt-4 p-4 rounded-lg bg-blue-50/70 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
              <QrCode size={15} /> Instant UPI Payment Link
            </span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="text-xs flex items-center gap-1 text-blue-700 hover:text-blue-900 font-medium"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              {copied ? "Copied UPI URL" : "Copy UPI URL"}
            </button>
          </div>

          <p className="text-xs text-blue-800 font-mono break-all bg-white/80 p-2 rounded border border-blue-100">
            {upiString}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <a
              href={upiString}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-700 text-white hover:bg-blue-800 transition-colors"
            >
              Open UPI App <ArrowRight size={13} />
            </a>
            <span className="text-[11px] text-blue-600">
              Customer can scan QR or tap in PhonePe / GPay / Paytm
            </span>
          </div>
        </div>
      )}

      {onDone && (
        <div className="mt-5 flex justify-end print:hidden">
          <button
            type="button"
            onClick={onDone}
            className="dash-form-submit"
          >
            Process Next Vehicle
          </button>
        </div>
      )}
    </div>
  );
}
