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
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-mark">
            <CarFront size={22} />
          </span>
          <div>
            <strong>Parkwise</strong>
            <small>SMART PARKING</small>
          </div>
        </div>

        <h1>Sign in to your account</h1>
        <p className="login-subtitle">Enter your credentials to access the parking management system</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@parking.io"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-field">
            <label htmlFor="login-password">Password</label>
            <div className="password-wrapper">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                minLength={1}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="login-footer-text">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="login-link">Create one</Link>
        </p>
      </div>
    </main>
  );
}
