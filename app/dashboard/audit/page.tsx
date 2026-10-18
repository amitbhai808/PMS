"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  User,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { apiGet } from "@/lib/client-api";
import { useAuth } from "@/components/auth-provider";

type AuditEntry = {
  id: string;
  actorUserId: string | null;
  event: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    setRefreshing(true);
    const url = entityFilter === "ALL"
      ? "/api/admin/audit?take=100"
      : `/api/admin/audit?take=100&entityType=${entityFilter}`;

    const res = await apiGet<{ logs: AuditEntry[] }>(url);
    if (res.ok) {
      setLogs(res.data.logs);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAuditLogs();
  }, [entityFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const eventMatch = log.event.toLowerCase().includes(q);
        const actorMatch = log.actor?.name.toLowerCase().includes(q) ?? false;
        const emailMatch = log.actor?.email.toLowerCase().includes(q) ?? false;
        const detailsMatch = log.details?.toLowerCase().includes(q) ?? false;
        if (!eventMatch && !actorMatch && !emailMatch && !detailsMatch) return false;
      }
      return true;
    });
  }, [logs, searchQuery]);

  if (user && user.role !== "SUPERADMIN") {
    return (
      <div className="dash-empty py-16">
        <ShieldAlert size={36} className="text-red-500 mb-2" />
        <h3>Access Restricted</h3>
        <p>Security audit logs are strictly restricted to SuperAdmin accounts.</p>
      </div>
    );
  }

  const formatEventName = (event: string) => {
    return event.replace(/_/g, " ");
  };

  return (
    <div>
      {/* Header */}
      <div className="dash-page-header-row mb-6">
        <div className="dash-page-header !mb-0">
          <h1>Security Audit Trail</h1>
          <p>Immutable forensic record of all operational gate activities, overrides, and supervisor actions</p>
        </div>

        <button
          onClick={loadAuditLogs}
          disabled={refreshing}
          className="dash-filter-tab flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={refreshing ? "spin" : ""} />
          <span>{refreshing ? "Refreshing…" : "Refresh Logs"}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="dash-panel mb-6 !p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="dash-filter-tabs !mb-0">
            {["ALL", "Booking", "Slot", "User"].map((ent) => (
              <button
                key={ent}
                onClick={() => setEntityFilter(ent)}
                className={`dash-filter-tab ${entityFilter === ent ? "active" : ""}`}
              >
                {ent === "ALL" ? "All Entities" : `${ent} Events`}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search event, actor, or details…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-neutral-300 w-64 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <Search size={14} className="absolute left-2.5 top-2 text-neutral-400" />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="dash-panel">
        <div className="dash-panel-header">
          <div>
            <h3 className="dash-panel-title">Audit Records ({filteredLogs.length})</h3>
            <p className="dash-panel-subtitle">Newest entries listed first</p>
          </div>
        </div>

        {loading ? (
          <div className="dash-empty py-12">
            <Loader2 size={24} className="spin text-neutral-400 mb-2" />
            <p>Loading security audit entries…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="dash-empty py-12">
            <FileText size={32} />
            <h3>No Audit Logs Found</h3>
            <p>No audit events match the active search or entity filter.</p>
          </div>
        ) : (
          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / Supervisor</th>
                  <th>Action Event</th>
                  <th>Target Entity</th>
                  <th>Details & Payload</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  let parsedDetails: Record<string, unknown> | null = null;
                  try {
                    if (log.details) parsedDetails = JSON.parse(log.details);
                  } catch {
                    /* raw string */
                  }

                  return (
                    <tr key={log.id} className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                      {/* Timestamp */}
                      <td>
                        <div className="text-xs">
                          <span className="font-mono text-neutral-800">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <div className="text-[10px] text-neutral-400">
                            {new Date(log.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </div>
                        </div>
                      </td>

                      {/* Actor */}
                      <td>
                        {log.actor ? (
                          <div className="text-xs">
                            <strong className="text-neutral-900 block">{log.actor.name}</strong>
                            <span className="text-[10px] text-neutral-500">{log.actor.role}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">System Automation / ANPR Gate</span>
                        )}
                      </td>

                      {/* Event */}
                      <td>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-300">
                          {log.event}
                        </span>
                      </td>

                      {/* Entity */}
                      <td>
                        <div className="text-xs">
                          <span className="font-semibold text-neutral-700">{log.entityType}</span>
                          {log.entityId && (
                            <div className="font-mono text-[10px] text-neutral-400">
                              #{log.entityId.slice(-8)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Details */}
                      <td>
                        <div className="text-xs">
                          {parsedDetails ? (
                            <div className="space-y-1">
                              {Object.entries(parsedDetails).map(([k, v]) => (
                                <span key={k} className="inline-block mr-2 text-[11px] bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200">
                                  <strong className="text-neutral-600">{k}:</strong> {String(v)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-neutral-500 font-mono text-[11px]">{log.details ?? "—"}</span>
                          )}
                        </div>
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
