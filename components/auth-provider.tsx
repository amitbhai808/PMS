"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/client-api";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "SUPERADMIN" | "OPERATOR" | "MEMBER";
  sessionId: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await apiGet<{ user?: AuthUser } | AuthUser>("/api/auth/me");
    if (result.ok && result.data) {
      const authUser = "user" in result.data && result.data.user ? result.data.user : (result.data as AuthUser);
      setUser(authUser);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await apiPost("/api/auth/logout", {});
    setUser(null);
    router.push("/login");
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
