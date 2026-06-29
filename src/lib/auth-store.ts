import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "client" | "freelancer";

interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  setSession: (s: Session | null) => void;
  setRole: (r: AppRole | null) => void;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  role: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setRole: (role) => set({ role }),
  refreshRole: async () => {
    const user = get().user;
    if (!user) return set({ role: null });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .order("role", { ascending: true });
    const roles = (data ?? []).map((r) => r.role as AppRole);
    const role =
      roles.find((r) => r === "admin") ??
      roles.find((r) => r === "client") ??
      roles.find((r) => r === "freelancer") ??
      null;
    set({ role });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, role: null });
  },
}));

export function dashboardPathForRole(role: AppRole | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "client":
      return "/client";
    case "freelancer":
    default:
      return "/freelancer";
  }
}