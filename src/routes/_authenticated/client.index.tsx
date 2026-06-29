import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { Briefcase, Users, BarChart3, Plus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/client/")({
  head: () => ({ meta: [{ title: "Client dashboard · SkillChain" }] }),
  component: ClientDashboard,
});

function ClientDashboard() {
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ["client-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("id, full_name").eq("auth_user_id", user!.id).maybeSingle();
      if (!profile) return { profile: null, openJobs: 0, totalApps: 0, totalJobs: 0 };
      const [openJobs, totalJobs, jobIdsRes] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("client_id", profile.id).eq("status", "open"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("client_id", profile.id),
        supabase.from("jobs").select("id").eq("client_id", profile.id),
      ]);
      const ids = (jobIdsRes.data ?? []).map((j) => j.id);
      const totalApps = ids.length
        ? (await supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", ids)).count ?? 0
        : 0;
      return { profile, openJobs: openJobs.count ?? 0, totalJobs: totalJobs.count ?? 0, totalApps };
    },
  });

  const cards = [
    { label: "Open jobs", value: String(data?.openJobs ?? 0), icon: Briefcase, hint: "Currently accepting applicants" },
    { label: "Total applicants", value: String(data?.totalApps ?? 0), icon: Users, hint: "Across all your jobs" },
    { label: "Posted jobs", value: String(data?.totalJobs ?? 0), icon: BarChart3, hint: "Lifetime" },
  ];

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Client</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Your hiring pipeline</h1>
            <p className="mt-1 text-sm text-muted-foreground">A calm overview of jobs and candidates.</p>
          </div>
          <Link to="/client/jobs/new" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background shadow-soft hover:bg-foreground/90">
            <Plus className="h-4 w-4" /> Post a job
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl border border-border/60 bg-surface-elevated p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-[var(--indigo)]" />
              </div>
              <p className="mt-3 font-display text-3xl font-semibold">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { to: "/client/jobs", label: "Manage jobs", icon: Briefcase, color: "var(--indigo)" },
            { to: "/client/candidates", label: "All candidates", icon: Users, color: "var(--coral)" },
            { to: "/client/analytics", label: "Analytics", icon: BarChart3, color: "var(--sage)" },
          ].map((q) => (
            <Link key={q.to} to={q.to} className="group flex items-center justify-between rounded-2xl border border-border/60 bg-surface-elevated/80 p-4 shadow-soft transition hover:border-foreground/30 hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: q.color }}><q.icon className="h-4 w-4" /></span>
                <span className="text-sm font-medium">{q.label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}