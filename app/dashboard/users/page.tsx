"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  ShieldAlert,
  Mail,
  Phone,
  Calendar,
  X,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/client-api";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "SUPERADMIN" | "OPERATOR" | "MEMBER";
  createdAt: string;
};

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Create Staff Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"SUPERADMIN" | "OPERATOR">("OPERATOR");
  const [showPassword, setShowPassword] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const { toast } = useToast();

  const loadUsers = async () => {
    setRefreshing(true);
    const res = await apiGet<{ users: UserRecord[] }>("/api/admin/users");
    if (res.ok) {
      setUsers(res.data.users);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (password.length < 12) {
      setModalError("Staff password must be at least 12 characters long");
      return;
    }

    setModalLoading(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    };
    if (phone.trim()) payload.phone = phone.trim();

    const res = await apiPost<{ user: UserRecord }>("/api/admin/users", payload);
    setModalLoading(false);

    if (!res.ok) {
      setModalError(res.error);
      return;
    }

    toast(`Staff account created for ${name}!`, "success");
    setIsModalOpen(false);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("OPERATOR");
    await loadUsers();
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = u.name.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        const phoneMatch = u.phone?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !emailMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  if (currentUser && currentUser.role !== "SUPERADMIN") {
    return (
      <div className="dash-empty py-16">
        <ShieldAlert size={36} className="text-red-500 mb-2" />
        <h3>Access Restricted</h3>
        <p>User account administration is restricted to SuperAdmin accounts.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="dash-page-header-row mb-6">
        <div className="dash-page-header !mb-0">
          <h1>User & Staff Administration</h1>
          <p>Manage facility operations team, supervisors, and registered members</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="dash-form-submit !h-9 !px-3.5 !text-xs"
          >
            <UserPlus size={14} />
            <span>Create Staff Account</span>
          </button>

          <button
            onClick={loadUsers}
            disabled={refreshing}
            className="dash-filter-tab flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="dash-panel mb-6 !p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="dash-filter-tabs !mb-0">
            {["ALL", "SUPERADMIN", "OPERATOR", "MEMBER"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`dash-filter-tab ${roleFilter === r ? "active" : ""}`}
              >
                {r === "ALL" ? "All Accounts" : r.charAt(0) + r.slice(1).toLowerCase()} ({
                  r === "ALL" ? users.length : users.filter((u) => u.role === r).length
                })
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, or phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-neutral-300 w-64 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <Search size={14} className="absolute left-2.5 top-2 text-neutral-400" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="dash-panel">
        <div className="dash-panel-header">
          <div>
            <h3 className="dash-panel-title">Accounts ({filteredUsers.length})</h3>
            <p className="dash-panel-subtitle">Sorted by registration date</p>
          </div>
        </div>

        {loading ? (
          <div className="dash-empty py-12">
            <Loader2 size={24} className="spin text-neutral-400 mb-2" />
            <p>Loading user registry…</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="dash-empty py-12">
            <Users size={32} />
            <h3>No Accounts Found</h3>
            <p>No user accounts matched the filter or search query.</p>
          </div>
        ) : (
          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Contact Info</th>
                  <th>Access Role</th>
                  <th>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="dash-avatar !w-8 !h-8 !text-xs">
                          {u.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <strong className="text-xs text-neutral-900 block">{u.name}</strong>
                          <span className="text-[10px] text-neutral-400 font-mono">ID: {u.id.slice(0, 10)}…</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <Mail size={12} className="text-neutral-400" />
                          <span>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                            <Phone size={12} className="text-neutral-400" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className={`status-badge ${u.role.toLowerCase()}`}>
                        {u.role === "SUPERADMIN" ? "Super Admin" : u.role}
                      </span>
                    </td>

                    <td>
                      <div className="text-xs text-neutral-600 flex items-center gap-1">
                        <Calendar size={12} className="text-neutral-400" />
                        <span>{new Date(u.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-700" />
                <h3 className="text-sm font-bold text-neutral-900 !m-0">Create Staff Account</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="login-error !mb-4">{modalError}</div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-xs p-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. operator2@parking.io"
                  className="w-full text-xs p-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mobile Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs p-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Staff Access Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "SUPERADMIN" | "OPERATOR")}
                  className="w-full text-xs p-2 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                >
                  <option value="OPERATOR">OPERATOR (Gate kiosk, slot overrides, reassignments)</option>
                  <option value="SUPERADMIN">SUPERADMIN (Full control, finances, user management)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Initial Password <span className="text-red-500">* (min 12 chars)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={12}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 12 characters"
                    className="w-full text-xs p-2 pr-8 rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="dash-form-reset !h-8 !text-xs !px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="dash-form-submit !h-8 !text-xs !px-4"
                >
                  {modalLoading ? <Loader2 size={13} className="spin" /> : <UserPlus size={13} />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
