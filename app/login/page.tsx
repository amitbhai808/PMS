"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CarFront, LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import { apiPost } from "@/lib/client-api";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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

    const result = await apiPost<{ user: { name: string; role: string } }>("/api/auth/login", {
      email,
      password,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast(`Welcome back, ${result.data.user.name}!`, "success");
    await refresh();

    // Redirect based on role
    if (result.data.user.role === "MEMBER") {
      router.push("/member");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-[#f0f5f2] via-[#e8ede9] to-[#f5f7f5] p-6">
      <div className="w-full max-w-[400px] bg-white border border-neutral-200 rounded-2xl p-8 sm:p-9 shadow-xl shadow-emerald-950/5">
        <div className="flex items-center gap-3 mb-7">
          <span className="w-10 h-10 rounded-xl text-white grid place-items-center bg-emerald-700 shadow-md shadow-emerald-700/20 shrink-0">
            <CarFront size={22} />
          </span>
          <div>
            <strong className="block text-lg font-bold tracking-tight text-neutral-800 leading-tight">Parkwise</strong>
            <small className="block text-neutral-400 font-bold tracking-[1.45px] text-[8px] mt-0.5">SMART PARKING</small>
          </div>
        </div>

        <h1 className="m-0 mb-1.5 text-xl font-bold text-neutral-900 tracking-tight">Sign in to your account</h1>
        <p className="m-0 mb-5 text-neutral-500 text-[13px] leading-relaxed">Enter your credentials to access the parking management system</p>

        {error && <div className="p-3 px-3.5 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[13px] font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-xs font-semibold text-neutral-700">Email address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@parking.io"
              required
              autoComplete="email"
              autoFocus
              className="h-10 px-3 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white transition-all duration-150 outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/10 placeholder:text-neutral-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-neutral-700">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                minLength={1}
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
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center mt-5 text-neutral-500 text-[13px]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline">Create one</Link>
        </p>
      </div>
    </main>
  );
}
