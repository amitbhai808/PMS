"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Clock,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useToast } from "@/components/toast";

type Transaction = {
  id: string;
  amount: number;
  amountPaise: number;
  type: string;
  reference: string;
  description: string | null;
  createdAt: string;
};

type WalletResponse = {
  wallet: {
    id: string;
    balance: number;
    balancePaise: number;
    currency: string;
  };
  transactions: Transaction[];
};

export default function MemberWalletPage() {
  const [wallet, setWallet] = useState<WalletResponse["wallet"] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Recharge State
  const [rechargeAmount, setRechargeAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [error, setError] = useState("");

  const { toast } = useToast();

  const loadWallet = useCallback(async () => {
    setRefreshing(true);
    const res = await apiGet<WalletResponse>("/api/wallet");
    if (res.ok) {
      setWallet(res.data.wallet);
      setTransactions(res.data.transactions);
      setError("");
    } else {
      setError(res.error);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amountInr = customAmount ? Number(customAmount) : rechargeAmount;
    if (!amountInr || amountInr <= 0) {
      setError("Please select or enter a valid recharge amount");
      return;
    }

    setRechargeLoading(true);

    const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const res = await apiPost<{ balance: number }>("/api/wallet/recharge", {
      amountPaise: Math.round(amountInr * 100),
      idempotencyKey,
    });

    setRechargeLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    toast(`₹${amountInr.toFixed(2)} added to your wallet!`, "success");
    setCustomAmount("");
    await loadWallet();
  };

  return (
    <div className="max-w-4xl">
      <div className="dash-page-header-row mb-6">
        <div className="dash-page-header !mb-0">
          <h1>Member Parking Wallet</h1>
          <p>Digital pre-paid balance for automatic gate checkout and zero-wait exit</p>
        </div>

        <button
          onClick={loadWallet}
          disabled={refreshing}
          className="dash-filter-tab flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={refreshing ? "spin" : ""} />
          <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 mb-6 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Balance Card */}
        <div className="md:col-span-1 dash-panel border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-neutral-50 flex flex-col justify-between">
          <div>
            <span className="dash-stat-label">Available Balance</span>
            <div className="text-3xl font-extrabold text-emerald-800 tracking-tight mt-1 mb-2">
              ₹{wallet?.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) ?? "0.00"}
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              When departing the facility, this balance is automatically charged, bypassing the manual payment kiosk.
            </p>
          </div>

          <div className="pt-4 border-t border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Automatic gate auto-debit ready</span>
          </div>
        </div>

        {/* Recharge Form */}
        <div className="md:col-span-2 dash-panel">
          <div className="dash-panel-header">
            <div>
              <h3 className="dash-panel-title flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-700" />
                Add Funds to Wallet
              </h3>
              <p className="dash-panel-subtitle">Development instant simulated top-up</p>
            </div>
          </div>

          <form onSubmit={handleRecharge} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-2">
                Select Top-Up Amount
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                {[200, 500, 1000, 2000].map((amt) => {
                  const isSelected = !customAmount && rechargeAmount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setCustomAmount("");
                        setRechargeAmount(amt);
                      }}
                      className={`dash-filter-tab !py-2 !px-4 !text-xs ${
                        isSelected ? "active !font-bold" : ""
                      }`}
                    >
                      +₹{amt}
                    </button>
                  );
                })}
              </div>

              <div>
                <input
                  type="number"
                  min={10}
                  max={50000}
                  placeholder="Or enter custom amount in ₹…"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={rechargeLoading}
              className="dash-form-submit w-full"
            >
              {rechargeLoading ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              <span>{rechargeLoading ? "Crediting Balance…" : "Instant Wallet Recharge"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Transactions List */}
      <div className="dash-panel">
        <div className="dash-panel-header">
          <div>
            <h3 className="dash-panel-title">Statement & Transactions</h3>
            <p className="dash-panel-subtitle">History of top-ups and parking visit debits</p>
          </div>
        </div>

        {loading ? (
          <div className="dash-empty py-10">
            <Loader2 size={24} className="spin text-neutral-400 mb-2" />
            <p>Loading transactions…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="dash-empty py-10">
            <Clock size={32} />
            <h3>No Transactions Yet</h3>
            <p>Your transaction history will show here when you recharge or complete parking visits.</p>
          </div>
        ) : (
          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Transaction Description</th>
                  <th>Type</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isCredit = tx.amount > 0;
                  return (
                    <tr key={tx.id}>
                      <td>
                        <div className="text-xs">
                          <span className="text-neutral-800">
                            {new Date(tx.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <div className="text-[10px] text-neutral-400">
                            {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="text-xs font-medium text-neutral-900">
                          {tx.description ?? tx.reference}
                        </div>
                        <div className="font-mono text-[10px] text-neutral-400">
                          Ref: {tx.reference}
                        </div>
                      </td>

                      <td>
                        <span className={`status-badge ${isCredit ? "active" : "completed"} !text-[10px]`}>
                          {tx.type}
                        </span>
                      </td>

                      <td className="text-right">
                        <span
                          className={`font-semibold text-xs inline-flex items-center gap-0.5 ${
                            isCredit ? "text-emerald-700" : "text-neutral-900"
                          }`}
                        >
                          {isCredit ? (
                            <>
                              <ArrowDownLeft size={12} /> +₹{tx.amount.toFixed(2)}
                            </>
                          ) : (
                            <>
                              <ArrowUpRight size={12} /> -₹{Math.abs(tx.amount).toFixed(2)}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
