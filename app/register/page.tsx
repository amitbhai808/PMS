"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CarFront, UserPlus, Loader2, Eye, EyeOff } from "lucide-react";
import { apiPost } from "@/lib/client-api";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { refresh } = useAuth();
  const { toast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body: Record<string, string> = { name, email, password };
    if (phone.trim()) body.phone = phone.trim();

    const result = await apiPost<{ user: { name: string } }>("/api/auth/register", body);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast(`Account created! Welcome, ${result.data.user.name}`, "success");
    await refresh();
    router.push("/member");
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-[#f0f5f2] via-[#e8ede9] to-[#f5f7f5] p-6">
      <div className="w-full max-w-[420px] bg-white border border-neutral-200 rounded-2xl p-8 sm:p-9 shadow-xl shadow-emerald-950/5">
        <div className="flex items-center gap-3 mb-7">
          <span className="w-10 h-10 rounded-xl text-white grid place-items-center bg-emerald-700 shadow-md shadow-emerald-700/20 shrink-0">
            <CarFront size={22} />
          </span>
          <div>
            <strong className="block text-lg font-bold tracking-tight text-neutral-800 leading-tight">Parkwise</strong>
            <small className="block text-neutral-400 font-bold tracking-[1.45px] text-[8px] mt-0.5">SMART PARKING</small>
          </div>
        </div>

        <h1 className="m-0 mb-1.5 text-xl font-bold text-neutral-900 tracking-tight">Create your account</h1>
        <p className="m-0 mb-5 text-neutral-500 text-[13px] leading-relaxed">Sign up as a member to reserve slots and manage your vehicles</p>

        {error && <div className="p-3 px-3.5 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[13px] font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-name" className="text-xs font-semibold text-neutral-700">Full name</label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Asha Rao"
              required
              minLength={2}
              maxLength={80}
              autoFocus
              className="h-10 px-3 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white transition-all duration-150 outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/10 placeholder:text-neutral-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-email" className="text-xs font-semibold text-neutral-700">Email address</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="asha@example.com"
              required
              autoComplete="email"
              className="h-10 px-3 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white transition-all duration-150 outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/10 placeholder:text-neutral-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-phone" className="text-xs font-semibold text-neutral-700">
              Phone number <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <input
              id="register-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              minLength={8}
              maxLength={20}
              className="h-10 px-3 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white transition-all duration-150 outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/10 placeholder:text-neutral-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-password" className="text-xs font-semibold text-neutral-700">
              Password <span className="font-normal text-neutral-400">(min 12 characters)</span>
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                className="h-10 w-full pl-3 pr-10 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white transition-all duration-150 outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/10 placeholder:text-neutral-400"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1.5 rounded transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 h-10.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors mt-1 cursor-pointer"
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center mt-5 text-neutral-500 text-[13px]">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
