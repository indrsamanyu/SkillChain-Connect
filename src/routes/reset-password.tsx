import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset password · SkillChain" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-warm-gradient">
      <div className="mx-auto max-w-md px-6 py-20">
        <div className="rounded-3xl border border-border/60 bg-surface-elevated p-7 shadow-elevated">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Choose a strong password you don't use elsewhere.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/15 outline-none"
              />
            </label>
            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Update password
            </button>
          </form>
          <Link to="/auth" search={{ mode: "signin" } as never} className="mt-5 inline-block text-sm text-[var(--indigo)]">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}