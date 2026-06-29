import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { Loader2, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/client/candidates")({
  head: () => ({ meta: [{ title: "Candidates · SkillChain" }] }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["client-candidates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user!.id).maybeSingle();
      if (!profile) return [];
      const { data: jobs } = await supabase.from("jobs").select("id, title").eq("client_id", profile.id);
      const ids = (jobs ?? []).map((j) => j.id);
      if (!ids.length) return [];
      const { data: apps } = await supabase
        .from("applications")
        .select("id, job_id, status, ai_match_score, created_at, freelancer:profiles!applications_freelancer_id_fkey(full_name, headline, location, freelancer_profiles(title, hourly_rate))")
        .in("job_id", ids)
        .order("ai_match_score", { ascending: false, nullsFirst: false });
      const jobMap = new Map((jobs ?? []).map((j) => [j.id, j.title]));
      return (apps ?? []).map((a) => ({ ...a, jobTitle: jobMap.get(a.job_id) ?? "—" }));
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Candidates</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">All applicants</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every candidate who applied across your jobs.</p>
        </div>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (data?.length ?? 0) === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface-elevated/60 p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-display text-xl font-semibold">No candidates yet</h2>
          </div>
        ) : (
          <div className="space-y-2">
            {data!.map((a) => {
              const f = a.freelancer as { full_name: string | null; headline: string | null; location: string | null; freelancer_profiles: { title: string | null; hourly_rate: number | null } | null } | null;
              const score = a.ai_match_score ?? 0;
              const scoreColor = score >= 70 ? "var(--sage)" : score >= 40 ? "var(--amber)" : "var(--coral)";
              return (
                <Link key={a.id} to="/client/jobs/$jobId" params={{ jobId: a.job_id }} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface-elevated p-4 shadow-soft transition hover:border-foreground/30">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold">{f?.full_name ?? "Unnamed"}</p>
                    <p className="text-sm text-foreground/70">{f?.freelancer_profiles?.title ?? f?.headline ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">For: <span className="text-foreground/70">{a.jobTitle}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{a.status}</Badge>
                    <div className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-semibold" style={{ color: scoreColor }}>
                      <Sparkles className="h-3 w-3" /> {score}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}