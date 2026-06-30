// Replaced @lovable.dev/cloud-auth-js with direct Supabase OAuth.
// This removes the dependency on Lovable's auth proxy and works on any host.
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      _provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions,
    ) => {
      // Map Lovable provider names to Supabase provider names.
      // "lovable" provider falls back to "google" as a safe default.
      const provider =
        _provider === "lovable" ? "google" : (_provider as "google" | "apple");

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri ?? window.location.origin,
          queryParams: opts?.extraParams,
        },
      });

      return { error: error ?? null, redirected: !error, tokens: null };
    },
  },
};
