import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { Loader2, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/freelancer/applications")({
  head: () => ({ meta: [{ title: "Applications · SkillChain" }] }),
  component: ApplicationsPage,
});

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--amber)",
  reviewing: "var(--indigo)",
  accepted: "var(--sage)",
  rejected: "var(--coral)",
  withdrawn: "var(--muted-foreground)",
};

function ApplicationsPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user!.id).maybeSingle();
      if (!profile) return [];
      const { data } = await supabase
        .from("applications")
        .select("id, status, ai_match_score, proposed_rate, created_at, cover_letter, jobs(id, title, description, budget_min, budget_max)")
        .eq("freelancer_id", profile.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Applications</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Your applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track status and review what you've sent.</p>
        </div>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (data?.length ?? 0) === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface-elevated/60 p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-display text-xl font-semibold">No applications yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Head to the <Link to="/freelancer/jobs" className="font-medium text-[var(--indigo)] hover:underline">jobs feed</Link> to apply.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data!.map((a) => {
              const job = a.jobs as { id: string; title: string; description: string; budget_min: number | null; budget_max: number | null } | null;
              const color = STATUS_COLOR[a.status] ?? "var(--muted-foreground)";
              return (
                <article key={a.id} className="rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-semibold tracking-tight">{job?.title ?? "Job removed"}</h3>
                      {job?.description && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{job.description}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Sent {new Date(a.created_at).toLocaleDateString()}</span>
                        {a.proposed_rate && <span>· ${a.proposed_rate}/hr</span>}
                        {a.ai_match_score != null && (
                          <span className="inline-flex items-center gap-1 font-medium" style={{ color: "var(--indigo)" }}>
                            <Sparkles className="h-3 w-3" /> {a.ai_match_score}% match
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize" style={{ color, borderColor: color }}>
                      {a.status}
                    </Badge>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}