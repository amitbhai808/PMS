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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Member Parking Wallet</h1>
          <p className="text-xs text-neutral-500 mt-1">Digital pre-paid balance for automatic gate checkout and zero-wait exit</p>
        </div>

        <button
          onClick={loadWallet}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
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
        <div className="md:col-span-1 bg-white border rounded-xl p-5 shadow-xs border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-neutral-50 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Available Balance</span>
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
        <div className="md:col-span-2 bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-700" />
                Add Funds to Wallet
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">Development instant simulated top-up</p>
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
                      className={`py-2 px-4 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-700 border-emerald-700 text-white font-bold shadow-xs"
                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
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
              className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              {rechargeLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>{rechargeLoading ? "Crediting Balance…" : "Instant Wallet Recharge"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Statement & Transactions</h3>
            <p className="text-xs text-neutral-500 mt-0.5">History of top-ups and parking visit debits</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 px-6 text-neutral-400 flex flex-col items-center justify-center">
            <Loader2 size={24} className="animate-spin text-neutral-400 mb-2" />
            <p className="text-xs text-neutral-500">Loading transactions…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 px-6 text-neutral-400 flex flex-col items-center justify-center">
            <Clock size={32} />
            <h3 className="text-sm font-semibold text-neutral-800 mt-2 mb-1">No Transactions Yet</h3>
            <p className="text-xs text-neutral-500">Your transaction history will show here when you recharge or complete parking visits.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Date & Time</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Transaction Description</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Type</th>
                  <th className="text-right p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {transactions.map((tx) => {
                  const isCredit = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="p-2.5 sm:px-3 align-middle">
                        <div className="text-xs">
                          <span className="text-neutral-800">
                            {new Date(tx.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <div className="text-[10px] text-neutral-400">
                            {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>

                      <td className="p-2.5 sm:px-3 align-middle">
                        <div className="text-xs font-medium text-neutral-900">
                          {tx.description ?? tx.reference}
                        </div>
                        <div className="font-mono text-[10px] text-neutral-400">
                          Ref: {tx.reference}
                        </div>
                      </td>

                      <td className="p-2.5 sm:px-3 align-middle">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          isCredit ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {tx.type}
                        </span>
                      </td>

                      <td className="text-right p-2.5 sm:px-3 align-middle">
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
