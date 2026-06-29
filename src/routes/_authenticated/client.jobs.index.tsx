import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { Plus, Loader2, Briefcase, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/client/jobs/")({
  head: () => ({ meta: [{ title: "My jobs · SkillChain" }] }),
  component: ClientJobsList,
});

function ClientJobsList() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["client-jobs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user!.id).maybeSingle();
      if (!profile) return [];
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, status, created_at, required_skills, budget_min, budget_max")
        .eq("client_id", profile.id)
        .order("created_at", { ascending: false });
      const ids = (jobs ?? []).map((j) => j.id);
      let counts = new Map<string, number>();
      if (ids.length) {
        const { data: apps } = await supabase.from("applications").select("job_id").in("job_id", ids);
        for (const a of apps ?? []) counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1);
      }
      return (jobs ?? []).map((j) => ({ ...j, applicants: counts.get(j.id) ?? 0 }));
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Jobs</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Manage your jobs</h1>
            <p className="mt-1 text-sm text-muted-foreground">Review applicants and update status.</p>
          </div>
          <Link to="/client/jobs/new" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background shadow-soft hover:bg-foreground/90">
            <Plus className="h-4 w-4" /> Post a job
          </Link>
        </div>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (data?.length ?? 0) === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface-elevated/60 p-12 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-display text-xl font-semibold">No jobs yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Post your first role to start receiving applicants.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data!.map((j) => (
              <Link key={j.id} to="/client/jobs/$jobId" params={{ jobId: j.id }} className="block rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft transition hover:border-foreground/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl font-semibold tracking-tight">{j.title}</h3>
                      <Badge variant="outline" className="capitalize">{j.status}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Posted {new Date(j.created_at).toLocaleDateString()}</span>
                      {(j.budget_min || j.budget_max) && <span>· ${j.budget_min ?? "—"}–${j.budget_max ?? "—"}</span>}
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    <Users className="h-3 w-3" /> {j.applicants} applicants
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}