import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";

export function AuthInitializer() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { setSession, refreshRole } = useAuthStore.getState();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      useAuthStore.setState({ loading: false });
      if (data.session) void refreshRole();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED"
      ) {
        return;
      }
      setSession(session);
      if (event === "SIGNED_OUT") {
        useAuthStore.setState({ role: null });
        queryClient.clear();
      } else {
        setTimeout(() => {
          void refreshRole();
          queryClient.invalidateQueries();
        }, 0);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  return null;
}