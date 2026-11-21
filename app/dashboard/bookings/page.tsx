"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CarFront,
  RefreshCw,
  Search,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { apiGet, apiDelete } from "@/lib/client-api";
import { useToast } from "@/components/toast";
import { Booking, BookingRow } from "@/components/parking/booking-row";

const PAGE_SIZE = 5;

export default function BookingsListPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const { toast } = useToast();

  const loadBookings = useCallback(async (offset = 0, append = false, take = PAGE_SIZE) => {
    if (append) setLoadingMore(true);
    else setRefreshing(true);
    const params = new URLSearchParams({ take: String(take), offset: String(offset) });
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    const res = await apiGet<{ bookings: Booking[]; hasMore: boolean }>(`/api/bookings?${params}`);
    if (res.ok) {
      setBookings((current) => append ? [...current, ...res.data.bookings] : res.data.bookings);
      setHasMore(res.data.hasMore);
    }
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [statusFilter]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const refreshBookings = async () => {
    // Keep the operator's expanded list after a refresh; only route/filter changes start at five.
    await loadBookings(0, false, Math.max(PAGE_SIZE, bookings.length));
  };

  const handleCancelReservation = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this pending reservation?")) {
      return;
    }

    const res = await apiDelete<{ booking: Booking }>(`/api/parking/reserve/${bookingId}`);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }

    toast("Reservation successfully cancelled", "success");
    await refreshBookings();
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Overdue filter
      if (onlyOverdue) {
        const isOverdue =
          b.status === "ACTIVE" &&
          !b.actualExit &&
          new Date(b.expectedExit) < new Date();
        if (!isOverdue) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const plateMatch = b.licensePlate.toLowerCase().includes(q);
        const slotMatch = b.slot?.code.toLowerCase().includes(q) ?? false;
        const idMatch = b.id.toLowerCase().includes(q);
        if (!plateMatch && !slotMatch && !idMatch) return false;
      }

      return true;
    });
  }, [bookings, onlyOverdue, searchQuery]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-800 tracking-tight m-0">Facility Bookings & Sessions</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-1 mb-0">Complete historical and live registry of vehicle sessions</p>
        </div>

        <button
          onClick={() => void refreshBookings()}
          disabled={refreshing}
          className="px-3.5 py-1.5 border border-neutral-300 rounded-md bg-white text-neutral-600 text-xs font-medium cursor-pointer hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
        </button>
      </div>

      {/* Control panel: status tabs & search */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {["ALL", "ACTIVE", "PENDING", "COMPLETED", "CANCELLED"].map((st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 border rounded-md text-xs font-medium cursor-pointer transition-colors ${active
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                    : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                >
                  {st === "ALL" ? "All Bookings" : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>

          {/* Search & Overstay Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search plate or slot…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-neutral-300 w-52 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <Search size={14} className="absolute left-2.5 top-2 text-neutral-400" />
            </div>

            <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOverdue}
                onChange={(e) => setOnlyOverdue(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span className={onlyOverdue ? "text-red-600 font-semibold" : ""}>
                Overstay only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            {/* <h3 className="text-[15px] font-semibold text-neutral-800 m-0">Records ({filteredBookings.length})</h3> */}
            <h3 className="text-[15px] font-semibold text-neutral-800 m-0">Loaded records ({bookings.length})</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5 m-0">Sorted by most recent entry/booking creation</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 px-6 text-neutral-400">
            <Loader2 size={24} className="animate-spin text-neutral-400 mb-2 mx-auto" />
            <p className="text-xs">Loading bookings…</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 px-6 text-neutral-400">
            <CarFront size={32} className="mx-auto mb-3 text-neutral-300" />
            <h3 className="m-0 mb-1.5 text-neutral-600 text-[15px] font-semibold">No Bookings Found</h3>
            <p className="m-0 text-[13px] text-neutral-500">No parking session records match the active filters or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse flex flex-col text-left text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Vehicle Plate</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Assigned Slot</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Entry Time</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Expected Exit</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Hourly Rate</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Status</th>
                  <th className="text-left p-2.5 sm:px-3 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider border-b border-neutral-200 bg-neutral-50/70">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    onCancel={handleCancelReservation}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading  && hasMore && (
          <div className="mt-5 flex justify-center border-t border-neutral-100 pt-5">
            <button
              type="button"
              onClick={() => void loadBookings(bookings.length, true)}
              disabled={loadingMore}
              className="inline-flex min-w-40 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
            >
              {loadingMore ? <Loader2 size={15} className="animate-spin" /> : <ChevronDown size={15} />}
              {loadingMore ? "Loading…" : "Load 5 more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
