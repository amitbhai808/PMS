"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CarFront,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  CalendarCheck,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { apiGet, apiDelete } from "@/lib/client-api";
import { useToast } from "@/components/toast";
import { Booking, BookingRow } from "@/components/parking/booking-row";

export default function BookingsListPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const { toast } = useToast();

  const loadBookings = useCallback(async () => {
    setRefreshing(true);
    const url = statusFilter === "ALL"
      ? "/api/bookings?take=100"
      : `/api/bookings?take=100&status=${statusFilter}`;

    const res = await apiGet<{ bookings: Booking[] }>(url);
    if (res.ok) {
      setBookings(res.data.bookings);
    }
    setLoading(false);
    setRefreshing(false);
  }, [statusFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

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
    await loadBookings();
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
      <div className="dash-page-header-row mb-6">
        <div className="dash-page-header !mb-0">
          <h1>Facility Bookings & Sessions</h1>
          <p>Complete historical and live registry of vehicle sessions</p>
        </div>

        <button
          onClick={loadBookings}
          disabled={refreshing}
          className="dash-filter-tab flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={refreshing ? "spin" : ""} />
          <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
        </button>
      </div>

      {/* Control panel: status tabs & search */}
      <div className="dash-panel mb-6 !p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="dash-filter-tabs !mb-0">
            {["ALL", "ACTIVE", "PENDING", "COMPLETED", "CANCELLED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`dash-filter-tab ${statusFilter === st ? "active" : ""}`}
              >
                {st === "ALL" ? "All Bookings" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
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
      <div className="dash-panel">
        <div className="dash-panel-header">
          <div>
            <h3 className="dash-panel-title">Records ({filteredBookings.length})</h3>
            <p className="dash-panel-subtitle">Sorted by most recent entry/booking creation</p>
          </div>
        </div>

        {loading ? (
          <div className="dash-empty py-12">
            <Loader2 size={24} className="spin text-neutral-400 mb-2" />
            <p>Loading bookings…</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="dash-empty py-12">
            <CarFront size={32} />
            <h3>No Bookings Found</h3>
            <p>No parking session records match the active filters or search criteria.</p>
          </div>
        ) : (
          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Vehicle Plate</th>
                  <th>Assigned Slot</th>
                  <th>Entry Time</th>
                  <th>Expected Exit</th>
                  <th>Hourly Rate</th>
                  <th>Status</th>
                  <th>Actions</th>
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
      </div>
    </div>
  );
}
