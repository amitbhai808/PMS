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

        <h1>Create your account</h1>
        <p className="login-subtitle">Sign up as a member to reserve slots and manage your vehicles</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label htmlFor="register-name">Full name</label>
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
            />
          </div>

          <div className="form-field">
            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="asha@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label htmlFor="register-phone">Phone number <span className="optional">(optional)</span></label>
            <input
              id="register-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              minLength={8}
              maxLength={20}
            />
          </div>

          <div className="form-field">
            <label htmlFor="register-password">Password <span className="optional">(min 12 characters)</span></label>
            <div className="password-wrapper">
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
            {loading ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="login-footer-text">
          Already have an account?{" "}
          <Link href="/login" className="login-link">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
