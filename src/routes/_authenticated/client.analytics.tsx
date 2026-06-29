import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/client/analytics")({
  head: () => ({ meta: [{ title: "Analytics · SkillChain" }] }),
  component: AnalyticsPage,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B", shortlisted: "#6366F1", accepted: "#10B981", rejected: "#EF4444", withdrawn: "#94A3B8",
};

function AnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["client-analytics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user!.id).maybeSingle();
      if (!profile) return null;
      const { data: jobs } = await supabase.from("jobs").select("id, title, created_at").eq("client_id", profile.id);
      const ids = (jobs ?? []).map((j) => j.id);
      const { data: apps } = ids.length
        ? await supabase.from("applications").select("status, ai_match_score, job_id").in("job_id", ids)
        : { data: [] as Array<{ status: string; ai_match_score: number | null; job_id: string }> };
      const byJob = new Map<string, number>();
      const byStatus = new Map<string, number>();
      const scores: number[] = [];
      for (const a of apps ?? []) {
        byJob.set(a.job_id, (byJob.get(a.job_id) ?? 0) + 1);
        byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1);
        if (a.ai_match_score != null) scores.push(a.ai_match_score);
      }
      const jobTitles = new Map((jobs ?? []).map((j) => [j.id, j.title]));
      const perJob = Array.from(byJob.entries()).map(([id, count]) => ({ name: (jobTitles.get(id) ?? "—").slice(0, 20), applicants: count }));
      const statusData = Array.from(byStatus.entries()).map(([status, value]) => ({ status, value }));
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return { perJob, statusData, avg, totalJobs: jobs?.length ?? 0, totalApps: apps?.length ?? 0 };
    },
  });

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Analytics</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Hiring performance</h1>
        </div>

        {isLoading || !data ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Stat label="Total jobs" value={data.totalJobs} />
              <Stat label="Total applicants" value={data.totalApps} />
              <Stat label="Avg AI match" value={`${data.avg}%`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-border/60 bg-surface-elevated p-5 shadow-soft">
                <h3 className="mb-4 font-display text-lg font-semibold">Applicants per job</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={data.perJob}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="applicants" fill="#6366F1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-border/60 bg-surface-elevated p-5 shadow-soft">
                <h3 className="mb-4 font-display text-lg font-semibold">Application status</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={data.statusData} dataKey="value" nameKey="status" outerRadius={90} innerRadius={50}>
                        {data.statusData.map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? "#94A3B8"} />)}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}